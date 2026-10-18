import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Feed } from '../src/db/feeds'
import { installAccessKeys, removeAccessKeys } from './access-helpers'

const BASE = 'https://rssagg.example/feeds'
const FEED_URL = 'https://example.com/feed.xml'

describe('/feeds', () => {
  let headers: Record<string, string>

  beforeEach(async () => {
    const keys = await installAccessKeys()
    headers = await keys.headers()
  })
  afterEach(async () => {
    removeAccessKeys()
    // テスト間で D1 の内容が引き継がれるため、登録したフィードを空に戻す。
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  function register(body: unknown): Promise<Response> {
    return exports.default.fetch(BASE, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  }

  async function list(): Promise<Feed[]> {
    const res = await exports.default.fetch(BASE, { headers })
    const json = await res.json<{ feeds: Feed[] }>()
    return json.feeds
  }

  it('登録した URL が一覧で取得できる', async () => {
    const res = await register({ url: FEED_URL })
    expect(res.status).toBe(201)

    const created = await res.json<Feed>()
    expect(created.url).toBe(FEED_URL)
    expect(await list()).toStrictEqual([created])
  })

  it('前後の空白は取り除いて登録する', async () => {
    const res = await register({ url: `  ${FEED_URL}  ` })
    expect((await res.json<Feed>()).url).toBe(FEED_URL)
  })

  it('表記違いの同じ URL（大文字のホスト名・既定ポート・フラグメント）は正規化して 409', async () => {
    const created = await (await register({ url: FEED_URL })).json<Feed>()

    const res = await register({ url: 'HTTPS://Example.COM:443/feed.xml#top' })
    expect(res.status).toBe(409)
    expect(await list()).toStrictEqual([created])
  })

  it('パスの末尾スラッシュは別の URL として扱う', async () => {
    await register({ url: FEED_URL })
    const res = await register({ url: `${FEED_URL}/` })
    expect(res.status).toBe(201)
  })

  it('本文が JSON でなければ invalid_body', async () => {
    const res = await register('not json')
    expect(res.status).toBe(400)
    expect(await res.json()).toStrictEqual({ error: 'invalid_body' })
  })

  it('同じ URL は二重に登録できず 409', async () => {
    await register({ url: FEED_URL })
    const res = await register({ url: FEED_URL })
    expect(res.status).toBe(409)
    expect(await list()).toHaveLength(1)
  })

  it.each([
    ['URL でない文字列', { url: 'not a url' }],
    ['http/https 以外のスキーム', { url: 'file:///etc/passwd' }],
    ['ftp スキーム', { url: 'ftp://example.com/feed.xml' }],
    ['認証情報つきの URL', { url: 'https://user:pass@example.com/feed.xml' }],
    ['url が無い', {}],
    ['url が文字列でない', { url: 123 }],
    ['長すぎる URL', { url: `https://example.com/${'a'.repeat(2048)}` }],
  ])('%s は 400 で登録しない', async (_name, body) => {
    const res = await register(body)
    expect(res.status).toBe(400)
    expect(await list()).toStrictEqual([])
  })

  it('削除すると一覧から消え、もう一度削除すると 404', async () => {
    const created = await (await register({ url: FEED_URL })).json<Feed>()

    const first = await exports.default.fetch(`${BASE}/${created.id}`, {
      method: 'DELETE',
      headers,
    })
    expect(first.status).toBe(204)
    expect(await list()).toStrictEqual([])

    const second = await exports.default.fetch(`${BASE}/${created.id}`, {
      method: 'DELETE',
      headers,
    })
    expect(second.status).toBe(404)
  })

  it.each(['abc', '0', '01', '1e3', '0x10', '1.0', '-1'])(
    '正の整数の表記でない id（%s）は 400 で、何も削除しない',
    async (id) => {
      const created = await (await register({ url: FEED_URL })).json<Feed>()
      const res = await exports.default.fetch(`${BASE}/${id}`, { method: 'DELETE', headers })
      expect(res.status).toBe(400)
      expect(await list()).toStrictEqual([created])
    },
  )

  it('JWT が無ければ登録・一覧・削除のどれも 401', async () => {
    const requests = [
      exports.default.fetch(BASE),
      exports.default.fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: FEED_URL }),
      }),
      exports.default.fetch(`${BASE}/1`, { method: 'DELETE' }),
    ]
    const statuses = (await Promise.all(requests)).map((res) => res.status)
    expect(statuses).toStrictEqual([401, 401, 401])
    expect(await list()).toStrictEqual([])
  })
})
