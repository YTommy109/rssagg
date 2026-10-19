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

  it('/ は doctype つきの HTML で、版を固定した htmx を SRI つきで読み込み、フィード管理へのリンクを持つ', async () => {
    const res = await exports.default.fetch(`${BASE}/`, { headers })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')

    const body = await res.text()
    expect(body.startsWith('<!DOCTYPE html>')).toBe(true)
    // 定数をそのまま突き合わせると、@latest や空の integrity にしても通ってしまう。
    // 「版が数字で固定されている」「SRI が sha384 の形をしている」という不変条件で見る。
    expect(body).toMatch(
      /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/htmx\.org@\d+\.\d+\.\d+\/dist\/htmx\.min\.js" integrity="sha384-[A-Za-z0-9+/]{64}" crossorigin="anonymous"/u,
    )
    expect(body).toContain('href="/settings/feeds"')
    // 404/409/422 を差し替えつつ error にする設定が落ちると、失敗の理由が出なくなるか、失敗なのに入力欄が消える。
    expect(body).toContain('name="htmx-config"')
    expect(body).toContain('404|409|422&quot;,&quot;swap&quot;:true,&quot;error&quot;:true')
  })

  it('JWT が無ければ 401', async () => {
    const res = await exports.default.fetch(`${BASE}/`)
    expect(res.status).toBe(401)
  })
})
