import { Hono } from 'hono'

import type { AppEnv } from '../env'
import { page } from '../views/layout'

export const homeRoute = new Hono<AppEnv>().get('/', (c) =>
  c.html(
    page(
      'rssagg',
      <section>
        <h1>rssagg</h1>
        <p>
          まず <a href="/settings/feeds">フィード</a> を登録する。
        </p>
      </section>,
    ),
  ),
)
