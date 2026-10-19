import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { installAccessKeys, removeAccessKeys } from './access-helpers'

const BASE = 'https://rssagg.example'

describe('後で読む', () => {
  let headers: Record<string, string>
  beforeEach(async () => {
    headers = await (await installAccessKeys()).headers()
    await env.DB.prepare(
      "INSERT INTO feeds (id, url, created_at) VALUES (1, 'https://a.test/f', 0)",
    ).run()
    await env.DB.prepare(
      `INSERT INTO articles (id, feed_id, guid, url, title, published_at, fetched_at) VALUES
       (1, 1, 'g1', 'https://a.test/1', '記事one', 100, 100),
       (2, 1, 'g2', 'https://a.test/2', '記事two', 200, 200)`,
    ).run()
  })
  afterEach(async () => {
    removeAccessKeys()
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  const call = (method: string, path: string) =>
    exports.default.fetch(`${BASE}${path}`, { method, headers })

  it('保存すると行が「保存済み」になり、取り消すと戻る。archive_key は NULL のまま', async () => {
    const saved = await call('PUT', '/articles/1/saved')
    expect(saved.status).toBe(200)
    const fragment = await saved.text()
    expect(fragment).toContain('<li id="article-1"')
    expect(fragment).toContain('hx-delete="/articles/1/saved"')
    expect(fragment).not.toContain('<html')

    const row = await env.DB.prepare('SELECT archive_key FROM saved WHERE article_id = 1').first<{
      archive_key: string | null
    }>()
    expect(row?.archive_key).toBeNull()

    // 二重に押しても行は 1 つのまま。
    await call('PUT', '/articles/1/saved')
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM saved').first<{ n: number }>()
    expect(count?.n).toBe(1)

    const removed = await call('DELETE', '/articles/1/saved')
    expect(await removed.text()).toContain('hx-put="/articles/1/saved"')
    const after = await env.DB.prepare('SELECT COUNT(*) AS n FROM saved').first<{ n: number }>()
    expect(after?.n).toBe(0)
  })

  it('記事一覧で保存済みが分かり、保存した記事だけの一覧は保存の新しい順', async () => {
    await call('PUT', '/articles/1/saved')
    await call('PUT', '/articles/2/saved')
    await call('DELETE', '/articles/2/saved')
    await call('PUT', '/articles/2/saved')

    const home = await (await exports.default.fetch(`${BASE}/`, { headers })).text()
    expect(home).toContain('hx-delete="/articles/1/saved"')
    expect(home).toContain('hx-delete="/articles/2/saved"')

    await call('DELETE', '/articles/1/saved')
    const list = await (await call('GET', '/articles/saved')).text()
    expect(list).toContain('記事two')
    // 保存一覧では、取り消した行は差し替えずに消す。
    expect(list).toContain('hx-swap="delete"')
    expect(list).not.toContain('記事one')
  })

  it('保存した記事が無ければ空であることを示す', async () => {
    expect(await (await call('GET', '/articles/saved')).text()).toContain(
      '保存した記事はまだありません',
    )
  })

  it('消えた記事は空の 200 で、不正な id は 400、JWT が無ければ 401', async () => {
    const gone = await call('PUT', '/articles/999/saved')
    expect(gone.status).toBe(200)
    expect(await gone.text()).toBe('')
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM saved').first<{ n: number }>()
    expect(count?.n).toBe(0)

    expect((await call('PUT', '/articles/1e3/saved')).status).toBe(400)
    expect(
      (await exports.default.fetch(`${BASE}/articles/1/saved`, { method: 'PUT' })).status,
    ).toBe(401)
  })
})
