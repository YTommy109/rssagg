import { Hono } from 'hono'

import type { AppEnv } from '../env'
import { page } from '../views/layout'

export const homeRoute = new Hono<AppEnv>()
  .get('/', (c) =>
    c.html(
      page(
        'rssagg',
        <section>
          <h1>rssagg</h1>
          {/* htmx が読み込まれ、サーバーの HTML 断片で差し替えられることを画面で確かめるための部品。 */}
          <button type="button" hx-get="/ui/status" hx-target="#status">
            サーバーの状態を確認する
          </button>
          <p id="status" aria-live="polite" />
        </section>,
      ),
    ),
  )
  .get('/ui/status', (c) => c.html(<span>ok（{new Date().toISOString()}）</span>))
