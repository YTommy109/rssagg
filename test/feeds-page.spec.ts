import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Feed } from '../src/db/feeds'
import { installAccessKeys, removeAccessKeys } from './access-helpers'

const BASE = 'https://rssagg.example/settings/feeds'
const FEED_URL = 'https://example.com/feed.xml'

describe('/settings/feeds（フィード管理画面）', () => {
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

  function add(url: string): Promise<Response> {
    return exports.default.fetch(BASE, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url }),
    })
  }

  async function feeds(): Promise<Feed[]> {
    const { results } = await env.DB.prepare(
      'SELECT id, url, title, created_at FROM feeds',
    ).all<Feed>()
    return results
  }

  it('登録済みのフィードを一覧に表示し、登録フォームを持つ', async () => {
    await add(FEED_URL)

    const res = await exports.default.fetch(BASE, { headers })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('hx-post="/settings/feeds"')
    expect(body).toContain(FEED_URL)
    expect(body).toContain('hx-delete=')
    // <style> の中身が HTML エスケープされると、空の一覧の表示が黙って効かなくなる。
    expect(body).toContain('content: "まだ登録されていません"')
  })

  it('登録すると行の断片が返り、DB に入る。前回の失敗の表示は消す', async () => {
    const res = await add(`  ${FEED_URL}  `)
    expect(res.status).toBe(201)

    const fragment = await res.text()
    expect(fragment).toContain('<li id="feed-')
    expect(fragment).toContain(FEED_URL)
    expect(fragment).not.toContain('<html')
    expect(fragment).toContain('hx-swap-oob="true"')
    expect((await feeds()).map((feed) => feed.url)).toStrictEqual([FEED_URL])
  })

  it('同じ URL は 409 で理由をフォーム下へ出し、登録しない', async () => {
    await add(FEED_URL)
    const res = await add('HTTPS://Example.COM:443/feed.xml#top')

    expect(res.status).toBe(409)
    expect(res.headers.get('HX-Retarget')).toBe('#form-error')
    expect(await res.text()).toContain('すでに登録されています')
    expect(await feeds()).toHaveLength(1)
  })

  it.each([
    ['URL でない文字列', 'not a url'],
    ['http/https 以外のスキーム', 'ftp://example.com/feed.xml'],
    ['認証情報つきの URL', 'https://user:pass@example.com/feed.xml'],
  ])('%s は 422 で理由をフォーム下へ出し、登録しない', async (_name, url) => {
    const res = await add(url)

    expect(res.status).toBe(422)
    expect(res.headers.get('HX-Retarget')).toBe('#form-error')
    expect(await res.text()).toContain('URL として読み取れません')
    expect(await feeds()).toStrictEqual([])
  })

  it('削除すると DB から消え、もう一度削除しても行を消せるよう 200', async () => {
    await add(FEED_URL)
    const [feed] = await feeds()
    const url = `${BASE}/${feed?.id}`

    const first = await exports.default.fetch(url, { method: 'DELETE', headers })
    expect(first.status).toBe(200)
    expect(await first.text()).toBe('')
    expect(await feeds()).toStrictEqual([])

    expect((await exports.default.fetch(url, { method: 'DELETE', headers })).status).toBe(200)
  })

  it('正の整数の表記でない id は 400 で、何も削除しない', async () => {
    await add(FEED_URL)
    const res = await exports.default.fetch(`${BASE}/1e3`, { method: 'DELETE', headers })
    expect(res.status).toBe(400)
    expect(await feeds()).toHaveLength(1)
  })

  it('JWT が無ければ表示・登録・削除のどれも 401', async () => {
    const statuses = (
      await Promise.all([
        exports.default.fetch(BASE),
        exports.default.fetch(BASE, {
          method: 'POST',
          body: new URLSearchParams({ url: FEED_URL }),
        }),
        exports.default.fetch(`${BASE}/1`, { method: 'DELETE' }),
      ])
    ).map((res) => res.status)
    expect(statuses).toStrictEqual([401, 401, 401])
    expect(await feeds()).toStrictEqual([])
  })
})
