import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Feed } from '../src/db/feeds'
import { installAccessKeys, removeAccessKeys, TEST_TEAM_DOMAIN } from './access-helpers'

const BASE = 'https://rssagg.example/settings/feeds'
const FEED_URL = 'https://example.com/feed.xml'
const RSS_BODY = `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>
<item><title>A</title><link>https://example.com/1</link><guid>g1</guid></item></channel></rss>`

describe('/settings/feeds（フィード管理画面）', () => {
  let headers: Record<string, string>
  // installAccessKeys が差し込んだ fetch。Access の鍵の取得だけは、ここへ素通しする。
  let accessFetch: typeof fetch

  /** 外部 URL の取得を handler の返すレスポンスに差し替える。Access の鍵の取得は触らない。 */
  const web = (handler: (req: Request) => Response) =>
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const req = new Request(input, init)
      return req.url.includes(TEST_TEAM_DOMAIN)
        ? accessFetch(input, init)
        : Promise.resolve(handler(req))
    })

  beforeEach(async () => {
    const keys = await installAccessKeys()
    headers = await keys.headers()
    // 登録時に URL を取得するので、既定ではどの URL もフィードを返す。個別のテストが差し替える。
    accessFetch = globalThis.fetch
    web(() => new Response(RSS_BODY))
  })
  afterEach(async () => {
    vi.restoreAllMocks()
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
    // 登録時に取得するので、行はタイトル（Blog）で出る。
    expect(fragment).toContain('Blog')
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

  describe('HTML ページからのフィード検出', () => {
    const PAGE = 'https://blog.test/post/1'
    const link = (href: string, title = '', type = 'application/rss+xml') =>
      `<link rel="alternate" type="${type}" href="${href}"${title === '' ? '' : ` title="${title}"`}>`
    const html = (...links: string[]) =>
      new Response(`<!doctype html><html><head>${links.join('')}</head><body></body></html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    const serve = (routes: Record<string, () => Response>) =>
      web((req) => routes[req.url]?.() ?? new Response('', { status: 404 }))
    const articleCount = async () =>
      (await env.DB.prepare('SELECT COUNT(*) AS n FROM articles').first<{ n: number }>())?.n

    it('フィード URL を直接登録すると、初回の取得（タイトルと記事）まで済む', async () => {
      const res = await add(FEED_URL)
      expect(res.status).toBe(201)
      expect(await res.text()).toContain('Blog')
      expect((await feeds()).map((f) => f.title)).toStrictEqual(['Blog'])
      expect(await articleCount()).toBe(1)
    })

    it('候補が 1 件なら、そのフィード URL（相対は絶対化）で登録する', async () => {
      serve({
        [PAGE]: () => html(link('/feed.xml', 'Blog'), link('/style.css', '', 'text/css')),
        'https://blog.test/feed.xml': () => new Response(RSS_BODY),
      })
      const res = await add(PAGE)
      expect(res.status).toBe(201)
      expect((await feeds()).map((f) => f.url)).toStrictEqual(['https://blog.test/feed.xml'])
      expect(await articleCount()).toBe(1)
    })

    it('候補が複数なら title つきで出し、選んだ URL で登録できる', async () => {
      serve({
        [PAGE]: () =>
          html(
            link('/feed.xml', '全体'),
            link('/comments.xml', 'コメント', 'application/atom+xml'),
          ),
        'https://blog.test/comments.xml': () => new Response(RSS_BODY),
      })
      const res = await add(PAGE)
      expect(res.status).toBe(422)
      expect(res.headers.get('HX-Retarget')).toBe('#form-error')
      const body = await res.text()
      expect(body).toContain('全体')
      expect(body).toContain('コメント')
      expect(body).toContain('https://blog.test/comments.xml')
      expect(await feeds()).toStrictEqual([])

      const chosen = await add('https://blog.test/comments.xml')
      expect(chosen.status).toBe(201)
      expect((await feeds()).map((f) => f.url)).toStrictEqual(['https://blog.test/comments.xml'])
    })

    it('候補が 0 件なら、理由つきで断り、一覧に残さない', async () => {
      serve({ [PAGE]: () => html(link('/style.css', '', 'text/css')) })
      const res = await add(PAGE)
      expect(res.status).toBe(422)
      expect(await res.text()).toContain('フィードが見つかりません')
      expect(await feeds()).toStrictEqual([])
    })

    it('取得に失敗する URL は 502 で理由を出し、一覧に残さない', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      serve({ [PAGE]: () => new Response('', { status: 500 }) })
      const res = await add(PAGE)
      expect(res.status).toBe(502)
      expect(await res.text()).toContain('HTTP 500')
      expect(await feeds()).toStrictEqual([])
    })

    it('解決後のフィード URL が登録済みなら 409', async () => {
      await add('https://blog.test/feed.xml')
      serve({
        [PAGE]: () => html(link('/feed.xml')),
        'https://blog.test/feed.xml': () => new Response(RSS_BODY),
      })
      const res = await add(PAGE)
      expect(res.status).toBe(409)
      expect(await feeds()).toHaveLength(1)
    })
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

  describe('今すぐ取得', () => {
    const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>
<item><title>A</title><link>https://example.com/1</link><guid>g1</guid></item></channel></rss>`
    const fetchNow = (id: number | undefined) =>
      exports.default.fetch(`${BASE}/${id}/fetch`, { method: 'POST', headers })
    const articleCount = async () =>
      (await env.DB.prepare('SELECT COUNT(*) AS n FROM articles').first<{ n: number }>())?.n

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('定期クロールと同じ取得で記事を保存し、タイトルを更新した行と結果を返す', async () => {
      await add(FEED_URL)
      const [feed] = await feeds()
      web(() => new Response(RSS))

      const res = await fetchNow(feed?.id)
      expect(res.status).toBe(200)
      const fragment = await res.text()
      expect(fragment).toContain('<li id="feed-')
      expect(fragment).toContain('hx-swap-oob="true"')
      expect(fragment).toContain('Blog')
      expect(fragment).toContain('取得しました')
      expect(await articleCount()).toBe(1)
    })

    it('取得に失敗したら 502 で理由をフォーム下へ出し、前回の成功の表示を消す', async () => {
      await add(FEED_URL)
      const [feed] = await feeds()
      vi.spyOn(console, 'error').mockImplementation(() => {})
      web(() => new Response('', { status: 500 }))
      // 登録時の取得で入った記事。失敗した取得が増やさないことを確かめるため、先に空にする。
      await env.DB.prepare('DELETE FROM articles').run()

      const res = await fetchNow(feed?.id)
      expect(res.status).toBe(502)
      expect(res.headers.get('HX-Retarget')).toBe('#form-error')
      const fragment = await res.text()
      expect(fragment).toContain('取得に失敗しました')
      expect(fragment).toContain('HTTP 500')
      expect(fragment).toContain('id="fetch-status"')
      expect(await articleCount()).toBe(0)
    })

    it('消えたフィードは 404、不正な id は 400', async () => {
      expect((await fetchNow(99_999)).status).toBe(404)
      expect(
        (await exports.default.fetch(`${BASE}/1e3/fetch`, { method: 'POST', headers })).status,
      ).toBe(400)
    })
  })

  it('正の整数の表記でない id は 400 で、何も削除しない', async () => {
    await add(FEED_URL)
    const res = await exports.default.fetch(`${BASE}/1e3`, { method: 'DELETE', headers })
    expect(res.status).toBe(400)
    expect(await feeds()).toHaveLength(1)
  })

  it('JWT が無ければ表示・登録・ジャンル変更・削除・今すぐ取得のどれも 401', async () => {
    const statuses = (
      await Promise.all([
        exports.default.fetch(BASE),
        exports.default.fetch(BASE, {
          method: 'POST',
          body: new URLSearchParams({ url: FEED_URL }),
        }),
        exports.default.fetch(`${BASE}/1/genre`, {
          method: 'PUT',
          body: new URLSearchParams({ genre: 'a' }),
        }),
        exports.default.fetch(`${BASE}/1`, { method: 'DELETE' }),
        exports.default.fetch(`${BASE}/1/fetch`, { method: 'POST' }),
      ])
    ).map((res) => res.status)
    expect(statuses).toStrictEqual([401, 401, 401, 401, 401])
    expect(await feeds()).toStrictEqual([])
  })
})
