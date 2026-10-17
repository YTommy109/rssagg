import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../env'
import { verifyAccessJwt } from './access'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Access JWT を検証し、無い・不正なら 401 を返す。
 *
 * 迂回（ACCESS_BYPASS=true）は、環境変数が明示されていて、かつ宛先が
 * ローカルホストの場合だけ効く。本番の vars には置かない運用だが、置き間違えても
 * 本番ホスト名宛てでは迂回できないようにする二重の安全側。
 */
export const accessMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const isLocal = LOCAL_HOSTS.has(new URL(c.req.url).hostname)
  if (c.env.ACCESS_BYPASS === 'true' && isLocal) return await next()

  const token = c.req.header('Cf-Access-Jwt-Assertion')
  const claims =
    token === undefined
      ? undefined
      : await verifyAccessJwt(token, {
          teamDomain: c.env.ACCESS_TEAM_DOMAIN,
          aud: c.env.ACCESS_AUD,
        })
  if (claims === undefined) return c.json({ error: 'unauthorized' }, 401)

  return await next()
})
