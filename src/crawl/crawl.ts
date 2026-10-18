import type { Feed } from '../db/feeds'
import { parseFeed } from './parse'

/** 同時に取得するフィード数。Workers の同時接続数（6）に収める。 */
const CONCURRENCY = 6

/** 1 フィードの取得を打ち切る時間。遅いフィード 1 つで cron 全体が詰まらないようにする。 */
const FETCH_TIMEOUT_MS = 15_000

/**
 * 1 フィードを取得して記事を保存する。更新が無ければ（304）本文を取り直さず、何も書かない。
 *
 * 記事は (feed_id, guid) の一意制約で二重登録を避ける。既存の記事は上書きしない
 * （既読や判定の紐付けを壊さないため）。
 */
export async function crawlFeed(db: D1Database, feed: Feed, now: number): Promise<void> {
  const headers = new Headers({ 'User-Agent': 'rssagg' })
  if (feed.etag !== null) headers.set('If-None-Match', feed.etag)
  if (feed.last_modified !== null) headers.set('If-Modified-Since', feed.last_modified)

  const res = await fetch(feed.url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (res.status === 304) return
  if (!res.ok) throw new Error(`${feed.url}: HTTP ${res.status}`)

  const parsed = parseFeed(await res.text())
  const insert = db.prepare(
    `INSERT INTO articles (feed_id, guid, url, title, excerpt, published_at, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (feed_id, guid) DO NOTHING`,
  )
  const update = db
    .prepare(
      'UPDATE feeds SET title = COALESCE(?, title), etag = ?, last_modified = ? WHERE id = ?',
    )
    .bind(parsed.title, res.headers.get('ETag'), res.headers.get('Last-Modified'), feed.id)
  // etag の更新は記事の保存と同じバッチに入れる。記事が保存されないまま etag だけ進むと、
  // 次回は 304 になって取りこぼした記事が二度と取れない。
  await db.batch([
    ...parsed.items.map((i) =>
      insert.bind(feed.id, i.guid, i.url, i.title, i.excerpt, i.publishedAt, now),
    ),
    update,
  ])
}

/**
 * 登録済みの全フィードを取得する。失敗したフィードは数えて報告するだけで、残りは続ける。
 * 同時実行数は CONCURRENCY までに絞る。
 */
export async function crawlAll(db: D1Database, now: number): Promise<{ failed: string[] }> {
  const { results: feeds } = await db.prepare('SELECT * FROM feeds ORDER BY id').all<Feed>()
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
