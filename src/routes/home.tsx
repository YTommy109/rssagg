import { Hono } from 'hono'

import { listRecentArticles } from '../db/articles'
import { listGenres } from '../db/feeds'
import type { AppEnv } from '../env'
import { ArticlesPage } from '../views/articles'
import { page } from '../views/layout'

export const homeRoute = new Hono<AppEnv>().get('/', async (c) => {
  const include = c.req.queries('include') ?? []
  const exclude = c.req.queries('exclude') ?? []
  const [articles, genres] = await Promise.all([
    listRecentArticles(c.env.DB, { include, exclude }),
    listGenres(c.env.DB),
  ])
  return c.html(
    page(
      'rssagg',
      <ArticlesPage articles={articles} genres={genres} include={include} exclude={exclude} />,
    ),
  )
})
