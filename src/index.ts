import { Hono } from 'hono'

import type { AppEnv } from './env'
import { crawlAll } from './jobs/crawl'
import { accessMiddleware } from './middleware/access-middleware'
import { articlesRoute } from './routes/articles'
import { feedsRoute } from './routes/feeds'
import { feedsPageRoute } from './routes/feeds-page'
import { homeRoute } from './routes/home'
import { staticRoute } from './routes/static'

const app = new Hono<AppEnv>()

// /healthz も Access 検証の対象にする。本番では Access の背後にあり、
// 検証を外すと「Access を経由しない経路」の穴を作るだけで得るものが無いため。
// ローカルでのヘルスチェックは ACCESS_BYPASS（.dev.vars）で行う。
app.use('*', accessMiddleware)

app.get('/healthz', (c) => c.json({ ok: true }))
app.route('/', homeRoute)
app.route('/static', staticRoute)
app.route('/articles', articlesRoute)
app.route('/feeds', feedsRoute)
app.route('/settings/feeds', feedsPageRoute)

export default {
  fetch: app.fetch,
  // wrangler.jsonc の triggers.crons（毎時）で起動する。
  async scheduled(_controller, env) {
    await crawlAll(env.DB, Math.floor(Date.now() / 1000))
  },
} satisfies ExportedHandler<Env>
