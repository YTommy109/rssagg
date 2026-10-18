import { Hono } from 'hono'
import { z } from 'zod'

import { deleteFeed, insertFeed, listFeeds } from '../db/feeds'
import type { AppEnv } from '../env'

// http/https 以外（file: や javascript: など）はクロールできず、受け付ける理由も無い。
// 認証情報つきの URL は DB と一覧にそのまま残ってしまうため受け付けない。
// 保存前に URL を正規化する（ホスト名の大文字小文字・既定ポート・フラグメント）のは、
// 表記違いの同じフィードを別物として登録させないため。パスは意味が変わり得るので触らない。
const registerSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2048)
    .pipe(z.url({ protocol: /^https?$/u }))
    .transform((raw) => new URL(raw))
    .refine((url) => url.username === '' && url.password === '')
    .transform((url) => {
      url.hash = ''
      return url.href
    }),
})

// Number() に任せると 1e3 や 0x10 まで整数として通り、別のフィードを消しかねない。
const idSchema = z
  .string()
  .regex(/^[1-9]\d{0,14}$/u)
  .transform(Number)

export const feedsRoute = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ feeds: await listFeeds(c.env.DB) }))
  .post('/', async (c) => {
    const body: unknown = await c.req.json().catch(() => null)
    if (body === null) return c.json({ error: 'invalid_body' }, 400)

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'invalid_url' }, 400)

    const feed = await insertFeed(c.env.DB, parsed.data.url, Math.floor(Date.now() / 1000))
    if (feed === undefined) return c.json({ error: 'already_registered' }, 409)
    return c.json(feed, 201)
  })
  .delete('/:id', async (c) => {
    const id = idSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.json({ error: 'invalid_id' }, 400)

    if (!(await deleteFeed(c.env.DB, id.data))) return c.json({ error: 'not_found' }, 404)
    return c.body(null, 204)
  })
