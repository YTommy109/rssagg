import { Hono } from 'hono'

import { listRecentArticles } from '../db/articles'
import type { AppEnv } from '../env'
import { ArticlesPage } from '../views/articles'
import { page } from '../views/layout'

export const homeRoute = new Hono<AppEnv>().get('/', async (c) =>
  c.html(page('rssagg', <ArticlesPage articles={await listRecentArticles(c.env.DB)} />)),
)
