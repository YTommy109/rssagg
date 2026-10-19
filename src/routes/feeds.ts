import { Hono } from 'hono'
import { z } from 'zod'

import { deleteFeed, insertFeed, listFeeds } from '../db/feeds'
import { feedUrlSchema } from '../domain/feed-input'
import { rowIdSchema } from '../domain/row-id'
import type { AppEnv } from '../env'

const registerSchema = z.object({ url: feedUrlSchema })

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
    const id = rowIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.json({ error: 'invalid_id' }, 400)

    if (!(await deleteFeed(c.env.DB, id.data))) return c.json({ error: 'not_found' }, 404)
    return c.body(null, 204)
  })
