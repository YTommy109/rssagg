import { exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { installAccessKeys, removeAccessKeys } from './access-helpers'

const BASE = 'https://rssagg.example'

describe('画面の土台', () => {
  let headers: Record<string, string>

  beforeEach(async () => {
    const keys = await installAccessKeys()
    headers = await keys.headers()
  })
  afterEach(removeAccessKeys)

  it('/ は doctype つきの HTML で、同梱した htmx と CSS を同一オリジンから読み込み、フィード管理へのリンクを持つ', async () => {
    const res = await exports.default.fetch(`${BASE}/`, { headers })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')

    const body = await res.text()
    expect(body.startsWith('<!DOCTYPE html>')).toBe(true)
    // ADR-0013: CDN ではなく同一オリジンから読み込む。
    expect(body).toMatch(/<script src="\/static\/htmx\.js" defer/u)
    expect(body).toContain('<link rel="stylesheet" href="/static/lism.css"')
    expect(body).not.toContain('cdn.jsdelivr.net')
    expect(body).toContain('href="/settings/feeds"')
    // 404/409/422 を差し替えつつ error にする設定が落ちると、失敗の理由が出なくなるか、失敗なのに入力欄が消える。
    expect(body).toContain('name="htmx-config"')
    expect(body).toContain('404|409|422|502&quot;,&quot;swap&quot;:true,&quot;error&quot;:true')
  })

  it('同梱した htmx と Lism CSS を配信し、JWT が無ければ 401', async () => {
    const js = await exports.default.fetch(`${BASE}/static/htmx.js`, { headers })
    expect(js.status).toBe(200)
    expect(js.headers.get('Content-Type')).toContain('text/javascript')
    expect(await js.text()).toContain('htmx')

    const css = await exports.default.fetch(`${BASE}/static/lism.css`, { headers })
    expect(css.status).toBe(200)
    expect(css.headers.get('Content-Type')).toContain('text/css')
    expect(await css.text()).toContain('@layer')

    expect((await exports.default.fetch(`${BASE}/static/htmx.js`)).status).toBe(401)
  })

  it('JWT が無ければ 401', async () => {
    const res = await exports.default.fetch(`${BASE}/`)
    expect(res.status).toBe(401)
  })
})
