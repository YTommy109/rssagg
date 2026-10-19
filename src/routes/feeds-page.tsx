import { type Context, Hono } from 'hono'

import { deleteFeed, insertFeed, listFeeds, listGenres, setFeedGenre } from '../db/feeds'
import { feedUrlSchema, genreSchema } from '../domain/feed-input'
import { rowIdSchema } from '../domain/row-id'
import type { AppEnv } from '../env'
import { AddedFeed, FeedsPage, GenreSaved } from '../views/feeds'
import { page } from '../views/layout'

/** 失敗の理由を、要求元の要素ではなくフォーム下の #form-error に入れる。 */
function reject(c: Context<AppEnv>, status: 404 | 409 | 422, message: string) {
  c.header('HX-Retarget', '#form-error')
  c.header('HX-Reswap', 'innerHTML')
  return c.html(<span>{message}</span>, status)
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

    const feed = await insertFeed(c.env.DB, url.data, Math.floor(Date.now() / 1000))
    if (feed === undefined) return reject(c, 409, 'すでに登録されています。')
    return c.html(<AddedFeed feed={feed} />, 201)
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
  .delete('/:id', async (c) => {
    const id = rowIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.text('invalid_id', 400)

    // 別のタブで先に消されていても、画面から行を消せば目的は同じなので、無ければ無いで 200 にする。
    await deleteFeed(c.env.DB, id.data)
    return c.body(null, 200)
  })
