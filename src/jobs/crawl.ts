import { insertArticleStatements } from '../db/articles'
import { type Feed, listFeeds, updateFeedCacheStatement } from '../db/feeds'
import { feedUrlSchema } from '../domain/feed-input'
import { decodeFeedBytes, type ParsedFeed, parseFeed } from '../domain/feed-parse'

/** 同時に取得するフィード数。Workers の同時接続数（6）に収める。 */
const CONCURRENCY = 6

/** 本文の上限。これを超えるレスポンスはパースせず失敗にする（Worker のメモリは 128MB）。 */
export const MAX_FEED_BYTES = 5 * 1024 * 1024

/** 1 フィードの取得を打ち切る時間。遅いフィード 1 つで cron 全体が詰まらないようにする。 */
const FETCH_TIMEOUT_MS = 15_000

/** 追うリダイレクトの回数。超えたら失敗にする。 */
const MAX_REDIRECTS = 5

/** 移動先を解決して feedUrlSchema で検査する。相対 Location は現在の URL を基準にする。通らなければ null。 */
function resolveRedirect(location: string, base: string): string | null {
  if (!URL.canParse(location, base)) return null
  const parsed = feedUrlSchema.safeParse(new URL(location, base).href)
  return parsed.success ? parsed.data : null
}

/**
 * リダイレクトを自前で追って取得する。fetch 任せだと、登録時に feedUrlSchema で検証した
 * URL と実際の取得先が食い違い、移動先が http/https 以外や認証情報つきでも検査されない。
 */
async function fetchFollowing(
  url: string,
  init: RequestInit,
): Promise<{ res: Response; url: string }> {
  let current = url
  for (let hops = 0; ; hops++) {
    // oxlint-disable-next-line no-await-in-loop -- 移動先は直前のレスポンスで決まるため、順に追う
    const res = await fetch(current, { ...init, redirect: 'manual' })
    const location = res.headers.get('Location')
    // 304 は Location があっても移動ではない。
    if (res.status < 300 || res.status >= 400 || res.status === 304 || location === null) {
      return { res, url: current }
    }
    // oxlint-disable-next-line no-await-in-loop -- 移動先に進むので、読まない本文は捨てる
    await res.body?.cancel()
    if (hops >= MAX_REDIRECTS) throw new Error(`${url}: too many redirects`)
    const next = resolveRedirect(location, current)
    if (next === null) throw new Error(`${url}: invalid redirect to ${location}`)
    current = next
  }
}

/**
 * 本文を上限付きで読む。Content-Length が上限超なら読まずに打ち切り、
 * 無い・偽りの場合は読みながらバイト数を数えて、超えた時点で打ち切る。
 */
async function readLimited(res: Response, url: string): Promise<Uint8Array> {
  if (Number(res.headers.get('Content-Length')) > MAX_FEED_BYTES) {
    await res.body?.cancel()
    throw new Error(`${url}: Content-Length exceeds ${MAX_FEED_BYTES} bytes`)
  }
  const chunks: Uint8Array[] = []
  let total = 0
  if (res.body) {
    for await (const chunk of res.body as AsyncIterable<Uint8Array>) {
      total += chunk.byteLength
      // 超えた時点で for await を抜けず throw すると、イテレータが body を cancel する。
      if (total > MAX_FEED_BYTES)
        throw new Error(`${url}: response exceeds ${MAX_FEED_BYTES} bytes`)
      chunks.push(chunk)
    }
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

/** 取得した本文。url はリダイレクトを追った後の取得先（HTML の相対 URL の基準になる）。 */
export type FetchedBody = { url: string; headers: Headers; bytes: Uint8Array }

/**
 * URL を取得して本文を読む。更新が無ければ（304）null。HTTP エラーは例外。
 * 定期クロールと、登録時の取得（利用者が入力した任意の URL）が共有する口なので、
 * リダイレクト検査とサイズ上限はここに集める。
 */
export async function fetchBody(url: string, extra = new Headers()): Promise<FetchedBody | null> {
  const headers = new Headers(extra)
  headers.set('User-Agent', 'rssagg')
  const { res, url: finalUrl } = await fetchFollowing(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (res.status === 304) return null
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return { url: finalUrl, headers: res.headers, bytes: await readLimited(res, url) }
}

/** 取得した本文をフィードとして解釈する。 */
export function parseFetched(fetched: FetchedBody): ParsedFeed {
  return parseFeed(decodeFeedBytes(fetched.bytes, fetched.headers.get('Content-Type')))
}

/** 解釈したフィードの記事とキャッシュ用ヘッダ（etag など）を保存する。 */
export async function saveFeed(
  db: D1Database,
  { feedId, parsed, headers }: { feedId: number; parsed: ParsedFeed; headers: Headers },
  now: number,
): Promise<void> {
  // etag の更新は記事の保存と同じバッチに入れる。記事が保存されないまま etag だけ進むと、
  // 次回は 304 になって取りこぼした記事が二度と取れない。
  await db.batch([
    ...insertArticleStatements(db, feedId, parsed.items, now),
    updateFeedCacheStatement(db, {
      id: feedId,
      title: parsed.title,
      etag: headers.get('ETag'),
      last_modified: headers.get('Last-Modified'),
    }),
  ])
}

/** 1 フィードを取得して記事を保存する。更新が無ければ（304）本文を取り直さず、何も書かない。 */
export async function crawlFeed(db: D1Database, feed: Feed, now: number): Promise<void> {
  const headers = new Headers()
  if (feed.etag !== null) headers.set('If-None-Match', feed.etag)
  if (feed.last_modified !== null) headers.set('If-Modified-Since', feed.last_modified)

  const fetched = await fetchBody(feed.url, headers)
  if (fetched === null) return
  await saveFeed(
    db,
    { feedId: feed.id, parsed: parseFetched(fetched), headers: fetched.headers },
    now,
  )
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
