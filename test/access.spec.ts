import { exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { installAccessKeys, removeAccessKeys, TEST_AUD } from './access-helpers'

const URL_HEALTHZ = 'https://rssagg.example/healthz'

describe('GET /healthz と Access JWT 検証', () => {
  let keys: Awaited<ReturnType<typeof installAccessKeys>>

  beforeEach(async () => {
    keys = await installAccessKeys()
  })
  afterEach(removeAccessKeys)

  it('JWT が無ければ 401', async () => {
    const res = await exports.default.fetch(URL_HEALTHZ)
    expect(res.status).toBe(401)
  })

  it('署名が不正なら 401', async () => {
    const token = await keys.sign({})
    const forged = `${token.slice(0, -4)}AAAA`
    const res = await exports.default.fetch(URL_HEALTHZ, {
      headers: { 'Cf-Access-Jwt-Assertion': forged },
    })
    expect(res.status).toBe(401)
  })

  it('aud が違えば 401', async () => {
    const token = await keys.sign({ aud: [`${TEST_AUD}-other`] })
    const res = await exports.default.fetch(URL_HEALTHZ, {
      headers: { 'Cf-Access-Jwt-Assertion': token },
    })
    expect(res.status).toBe(401)
  })

  it('正しい JWT なら 200 で ok を返す', async () => {
    const res = await exports.default.fetch(URL_HEALTHZ, { headers: await keys.headers() })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
