import { insertArticleStatements } from '../db/articles'
import { type Feed, listFeeds, updateFeedCacheStatement } from '../db/feeds'
import { decodeFeedBytes, parseFeed } from '../domain/feed-parse'

/** 同時に取得するフィード数。Workers の同時接続数（6）に収める。 */
const CONCURRENCY = 6

/** 1 フィードの取得を打ち切る時間。遅いフィード 1 つで cron 全体が詰まらないようにする。 */
const FETCH_TIMEOUT_MS = 15_000

/** 1 フィードを取得して記事を保存する。更新が無ければ（304）本文を取り直さず、何も書かない。 */
export async function crawlFeed(db: D1Database, feed: Feed, now: number): Promise<void> {
  const headers = new Headers({ 'User-Agent': 'rssagg' })
  if (feed.etag !== null) headers.set('If-None-Match', feed.etag)
  if (feed.last_modified !== null) headers.set('If-Modified-Since', feed.last_modified)

  const res = await fetch(feed.url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (res.status === 304) return
  if (!res.ok) throw new Error(`${feed.url}: HTTP ${res.status}`)

  const parsed = parseFeed(
    decodeFeedBytes(new Uint8Array(await res.arrayBuffer()), res.headers.get('Content-Type')),
  )
  // etag の更新は記事の保存と同じバッチに入れる。記事が保存されないまま etag だけ進むと、
  // 次回は 304 になって取りこぼした記事が二度と取れない。
  await db.batch([
    ...insertArticleStatements(db, feed.id, parsed.items, now),
    updateFeedCacheStatement(db, {
      id: feed.id,
      title: parsed.title,
      etag: res.headers.get('ETag'),
      last_modified: res.headers.get('Last-Modified'),
    }),
  ])
}

/**
 * 登録済みの全フィードを取得する。失敗したフィードは数えて報告するだけで、残りは続ける。
 * 同時実行数は CONCURRENCY までに絞る。
 */
export async function crawlAll(db: D1Database, now: number): Promise<{ failed: string[] }> {
  const feeds = await listFeeds(db)
  const failed: string[] = []
  // 並列数を絞るため、CONCURRENCY 件ずつ取得する。
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    // oxlint-disable-next-line no-await-in-loop -- 並列数を制限するために、グループごとに待つ
    await Promise.all(
      feeds.slice(i, i + CONCURRENCY).map(async (feed) => {
        try {
          await crawlFeed(db, feed, now)
        } catch (error) {
          console.error(`crawl failed: ${feed.url}`, error)
          failed.push(feed.url)
        }
      }),
    )
  }
  return { failed }
}
