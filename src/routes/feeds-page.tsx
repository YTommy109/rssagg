import { Hono } from 'hono'

import { deleteFeed, insertFeed, listFeeds, listGenres, setFeedGenre } from '../db/feeds'
import { feedIdSchema, feedUrlSchema, genreSchema } from '../domain/feed-input'
import type { AppEnv } from '../env'
import { AddedFeed, FeedsPage } from '../views/feeds'
import { page } from '../views/layout'

/**
 * 画面（HTML）のフィード管理。JSON の API（/feeds）とは別に、HTML の断片を返す（ADR-0006）。
 *
 * 失敗の理由は、一覧ではなくフォーム下の #form-error へ入れる。htmx は 4xx を既定では差し替えないため、
 * layout の htmx-config で 409 と 422 だけを差し替える設定にしてある。
 */
export const feedsPageRoute = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.html(
      page(
        'フィード',
        <FeedsPage feeds={await listFeeds(c.env.DB)} genres={await listGenres(c.env.DB)} />,
      ),
    ),
  )
  .post('/', async (c) => {
    const reject = (status: 409 | 422, message: string) => {
      c.header('HX-Retarget', '#form-error')
      c.header('HX-Reswap', 'innerHTML')
      return c.html(<span>{message}</span>, status)
    }

    const body = await c.req.parseBody()
    const url = feedUrlSchema.safeParse(body['url'])
    if (!url.success) {
      return reject(
        422,
        'URL として読み取れません。http または https で始まり、ユーザー名やパスワードを含まない URL を入力してください。',
      )
    }

    const feed = await insertFeed(c.env.DB, url.data, Math.floor(Date.now() / 1000))
    if (feed === undefined) return reject(409, 'すでに登録されています。')
    return c.html(<AddedFeed feed={feed} />, 201)
  })
  .put('/:id/genre', async (c) => {
    const id = feedIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.text('invalid_id', 400)
    const genre = genreSchema.safeParse((await c.req.parseBody())['genre'])
    if (!genre.success) return c.text('invalid_genre', 422)

    if (!(await setFeedGenre(c.env.DB, id.data, genre.data))) return c.text('not_found', 404)
    return c.body(null, 204)
  })
  .delete('/:id', async (c) => {
    const id = feedIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.text('invalid_id', 400)

    // 別のタブで先に消されていても、画面から行を消せば目的は同じなので、無ければ無いで 200 にする。
    await deleteFeed(c.env.DB, id.data)
    return c.body(null, 200)
  })
