import { type Context, Hono } from 'hono'
import type { Child } from 'hono/jsx'

import {
  deleteFeed,
  getFeed,
  insertFeed,
  listFeeds,
  listGenres,
  setFeedGenre,
  setFeedJudgeEach,
} from '../db/feeds'
import { findFeedLinks, looksLikeHtml } from '../domain/feed-discover'
import { feedUrlSchema, genreSchema } from '../domain/feed-input'
import { decodeFeedBytes, parseFeed } from '../domain/feed-parse'
import { rowIdSchema } from '../domain/row-id'
import type { AppEnv } from '../env'
import { crawlFeed, fetchBody, saveFeed } from '../jobs/crawl'
import {
  AddedFeed,
  Candidates,
  ClearFetchStatus,
  Fetched,
  FeedsPage,
  GenreSaved,
} from '../views/feeds'
import { page } from '../views/layout'

/** 失敗の理由を、要求元の要素ではなくフォーム下の #form-error に入れる。 */
function reject(c: Context<AppEnv>, status: 404 | 409 | 422 | 502, message: Child) {
  c.header('HX-Retarget', '#form-error')
  c.header('HX-Reswap', 'innerHTML')
  return c.html(<span>{message}</span>, status)
}

/** 失敗の例外から、画面に出す理由の文字列を取る。 */
const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

/**
 * HTML ページから見つけた候補の扱い。1 件ならその URL で登録し（探すのは 1 段だけ）、
 * 複数なら自動では選ばず利用者に選ばせる。
 */
async function registerFromPage(
  c: Context<AppEnv>,
  html: string,
  pageUrl: string,
  discover: boolean,
): Promise<Response> {
  const candidates = discover ? await findFeedLinks(html, pageUrl) : []
  const [only, second] = candidates
  if (only === undefined) return reject(c, 422, 'フィードが見つかりません。')
  if (second === undefined) return register(c, only.url, false)
  return reject(c, 422, <Candidates candidates={candidates} />)
}

/**
 * URL を 1 回取得して登録する。フィードならそのまま登録して取得も済ませ、HTML なら
 * <link rel="alternate"> から探す。取得に失敗した URL は、誤登録を避けるため登録しない。
 */
async function register(c: Context<AppEnv>, url: string, discover: boolean): Promise<Response> {
  let fetched
  try {
    fetched = await fetchBody(url)
  } catch (error) {
    console.error(`register fetch failed: ${url}`, error)
    return reject(c, 502, `取得に失敗したため登録しませんでした: ${reason(error)}`)
  }
  if (fetched === null) return reject(c, 502, '取得に失敗したため登録しませんでした。')

  const contentType = fetched.headers.get('Content-Type')
  const text = decodeFeedBytes(fetched.bytes, contentType)
  if (looksLikeHtml(text, contentType)) return registerFromPage(c, text, fetched.url, discover)

  let parsed
  try {
    parsed = parseFeed(text)
  } catch (error) {
    return reject(c, 422, `フィードとして読み取れません: ${reason(error)}`)
  }
  const now = Math.floor(Date.now() / 1000)
  const feed = await insertFeed(c.env.DB, url, now)
  if (feed === undefined) return reject(c, 409, 'すでに登録されています。')
  await saveFeed(c.env.DB, { feedId: feed.id, parsed, headers: fetched.headers }, now)
  return c.html(<AddedFeed feed={(await getFeed(c.env.DB, feed.id)) ?? feed} />, 201)
}

/**
 * 画面（HTML）のフィード管理。JSON の API（/feeds）とは別に、HTML の断片を返す（ADR-0006）。
 *
 * 失敗の理由は、一覧ではなくフォーム下の #form-error へ入れる。htmx は 4xx を既定では差し替えないため、
 * layout の htmx-config で 404・409・422 だけを差し替える設定にしてある。
 */
export const feedsPageRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const [feeds, genres] = await Promise.all([listFeeds(c.env.DB), listGenres(c.env.DB)])
    return c.html(page('フィード', <FeedsPage feeds={feeds} genres={genres} />))
  })
  .post('/', async (c) => {
    const body = await c.req.parseBody()
    const url = feedUrlSchema.safeParse(body['url'])
    if (!url.success) {
      return reject(
        c,
        422,
        'URL として読み取れません。http または https で始まり、ユーザー名やパスワードを含まない URL を入力してください。',
      )
    }

    return register(c, url.data, true)
  })
  .put('/:id/genre', async (c) => {
    const id = rowIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.text('invalid_id', 400)
    const genre = genreSchema.safeParse((await c.req.parseBody())['genre'])
    if (!genre.success) return reject(c, 422, 'ジャンルは 50 文字以内で入力してください。')

    if (!(await setFeedGenre(c.env.DB, id.data, genre.data))) {
      return reject(c, 404, 'このフィードは削除されています。ページを再読み込みしてください。')
    }
    return c.html(<GenreSaved genres={await listGenres(c.env.DB)} />)
  })
  // チェックを外すとフォーム値が空で届くので、'on' かどうかだけで決める。
  .put('/:id/judge-each', async (c) => {
    const id = rowIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.text('invalid_id', 400)
    const on = (await c.req.parseBody())['judge_each'] === 'on'

    if (!(await setFeedJudgeEach(c.env.DB, id.data, on))) {
      return reject(c, 404, 'このフィードは削除されています。ページを再読み込みしてください。')
    }
    return c.body(null, 200)
  })
  .post('/:id/fetch', async (c) => {
    const id = rowIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.text('invalid_id', 400)
    const feed = await getFeed(c.env.DB, id.data)
    if (feed === undefined) {
      return reject(c, 404, 'このフィードは削除されています。ページを再読み込みしてください。')
    }

    // 定期クロールと同じ取得処理。失敗の理由はそのまま見せる（利用者は自分 1 人）。
    try {
      await crawlFeed(c.env.DB, feed, Math.floor(Date.now() / 1000))
    } catch (error) {
      console.error(`fetch failed: ${feed.url}`, error)
      c.header('HX-Retarget', '#form-error')
      c.header('HX-Reswap', 'innerHTML')
      return c.html(
        <>
          <span>取得に失敗しました: {error instanceof Error ? error.message : String(error)}</span>
          <ClearFetchStatus />
        </>,
        502,
      )
    }
    // 取得でタイトルが入るので、行は取り直す。取得中に削除されていたら、行を足さず結果だけ返す。
    const fresh = await getFeed(c.env.DB, id.data)
    return fresh === undefined ? c.body(null, 200) : c.html(<Fetched feed={fresh} />)
  })
  .delete('/:id', async (c) => {
    const id = rowIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.text('invalid_id', 400)

    // 別のタブで先に消されていても、画面から行を消せば目的は同じなので、無ければ無いで 200 にする。
    await deleteFeed(c.env.DB, id.data)
    return c.body(null, 200)
  })
