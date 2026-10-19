import { Hono } from 'hono'

import { listRecentArticles } from '../db/articles'
import { listGenres } from '../db/feeds'
import type { AppEnv } from '../env'
import { ArticlesPage } from '../views/articles'
import { page } from '../views/layout'

export const homeRoute = new Hono<AppEnv>().get('/', async (c) => {
  // クエリは実在するジャンルに絞る。空値や消えたジャンルがそのまま SQL に渡ると、チェックは何も
  // 付いていないのに記事が隠れる。genres 側から拾うので重複も消え、バインドの数は DB の行数を超えない。
  const genres = await listGenres(c.env.DB)
  const known = (name: string) => {
    const asked = new Set(c.req.queries(name) ?? [])
    return genres.filter((g) => asked.has(g))
  }
  const include = known('include')
  const exclude = known('exclude')
  const articles = await listRecentArticles(c.env.DB, { include, exclude })
  return c.html(
    page(
      'rssagg',
      <ArticlesPage articles={articles} genres={genres} include={include} exclude={exclude} />,
    ),
  )
})
