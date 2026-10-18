import { Hono } from 'hono'

import type { AppEnv } from './env'
import { accessMiddleware } from './middleware/access-middleware'
import { feedsRoute } from './routes/feeds'

const app = new Hono<AppEnv>()

// /healthz も Access 検証の対象にする。本番では Access の背後にあり、
// 検証を外すと「Access を経由しない経路」の穴を作るだけで得るものが無いため。
// ローカルでのヘルスチェックは ACCESS_BYPASS（.dev.vars）で行う。
app.use('*', accessMiddleware)

app.get('/healthz', (c) => c.json({ ok: true }))
app.route('/feeds', feedsRoute)

export default app
