import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { crawlAll, MAX_FEED_BYTES } from '../src/jobs/crawl'

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>
<item><title>A</title><link>https://a.test/1</link><guid>g1</guid></item>
<item><title>B</title><link>https://a.test/2</link></item></channel></rss>`

describe('crawlAll', () => {
  const NOW = 1_800_000_000
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO feeds (id, url, created_at) VALUES (1, 'https://a.test/feed', 0)",
      ),
      env.DB.prepare(
        "INSERT INTO feeds (id, url, created_at) VALUES (2, 'https://bad.test/feed', 0)",
      ),
    ])
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  const count = async () =>
    (await env.DB.prepare('SELECT COUNT(*) AS n FROM articles').first<{ n: number }>())?.n

  it('失敗したフィードがあっても他のフィードの記事を保存し、失敗を報告する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      Promise.resolve(
        new Request(input).url.includes('bad')
          ? new Response('', { status: 500 })
          : new Response(RSS, { headers: { ETag: '"v1"' } }),
      ),
    )
    const { failed } = await crawlAll(env.DB, NOW)
    expect(failed).toStrictEqual(['https://bad.test/feed'])
    expect(await count()).toBe(2)
  })

  it('保存した ETag を送り、304 なら本文を取り直さず何も変えない。再取得しても二重登録しない', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(new Response(RSS, { headers: { ETag: '"v1"', 'Last-Modified': 'x' } })),
      )
    await env.DB.prepare('DELETE FROM feeds WHERE id = 2').run()
    await crawlAll(env.DB, NOW)

    spy.mockImplementation(() => Promise.resolve(new Response(null, { status: 304 })))
    await crawlAll(env.DB, NOW)
    const sent = new Headers(spy.mock.calls[1]?.[1]?.headers)
    expect(sent.get('If-None-Match')).toBe('"v1"')
    expect(sent.get('If-Modified-Since')).toBe('x')

    spy.mockImplementation(() => Promise.resolve(new Response(RSS)))
    await crawlAll(env.DB, NOW)
    expect(await count()).toBe(2)
  })

  it('別のフィードが同じ記事（計測用パラメータ・fragment 違いの URL）を配信しても 1 件にする', async () => {
    const other = `<?xml version="1.0"?><rss version="2.0"><channel><title>Mirror</title>
<item><title>A</title><link>https://a.test/1?utm_source=rss#top</link><guid>m1</guid></item></channel></rss>`
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      Promise.resolve(new Response(new Request(input).url.includes('bad') ? other : RSS)),
    )
    await crawlAll(env.DB, NOW)
    // RSS は A・B の 2 件、other は A と同じ記事なので増えない。
    expect(await count()).toBe(2)
  })

  describe('レスポンスサイズの上限', () => {
    // RSS を空白で水増しして、本文のバイト数をちょうど size にする。
    const sized = (size: number) =>
      RSS + ' '.repeat(size - new TextEncoder().encode(RSS).byteLength)
    const run = async (res: () => Response) => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(res()))
      await env.DB.prepare('DELETE FROM feeds WHERE id = 2').run()
      return crawlAll(env.DB, NOW)
    }

    it('上限ちょうどなら保存する', async () => {
      const { failed } = await run(() => new Response(sized(MAX_FEED_BYTES)))
      expect(failed).toStrictEqual([])
      expect(await count()).toBe(2)
    })

    it('上限を超えたら失敗にして保存しない（Content-Length 無し）', async () => {
      const { failed } = await run(() => new Response(sized(MAX_FEED_BYTES + 1)))
      expect(failed).toStrictEqual(['https://a.test/feed'])
      expect(await count()).toBe(0)
    })

    it('Content-Length が上限超なら本文を読まずに失敗にする', async () => {
      const pull = vi.fn<() => void>()
      const body = new ReadableStream({ pull }, { highWaterMark: 0 })
      const { failed } = await run(
        () => new Response(body, { headers: { 'Content-Length': String(MAX_FEED_BYTES + 1) } }),
      )
      expect(failed).toStrictEqual(['https://a.test/feed'])
      expect(pull).not.toHaveBeenCalled()
    })

    it('Content-Length が偽りでも、読みながら数えて失敗にする', async () => {
      const { failed } = await run(
        () => new Response(sized(MAX_FEED_BYTES + 1), { headers: { 'Content-Length': '10' } }),
      )
      expect(failed).toStrictEqual(['https://a.test/feed'])
    })
  })

  describe('リダイレクト', () => {
    const moved = (location: string, status = 301) =>
      new Response(null, { status, headers: { Location: location } })
    // a.test/feed から始め、URL ごとに返すレスポンスを決める。
    const run = async (routes: Record<string, () => Response>) => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const route = routes[new Request(input).url]
        return Promise.resolve(route ? route() : new Response('', { status: 404 }))
      })
      await env.DB.prepare('DELETE FROM feeds WHERE id = 2').run()
      return { result: await crawlAll(env.DB, NOW), spy }
    }

    it('移動先を追って取得する（相対 Location は取得元 URL を基準に解決する）', async () => {
      const { result, spy } = await run({
        'https://a.test/feed': () => moved('/new/feed'),
        'https://a.test/new/feed': () => moved('https://b.test/rss', 302),
        'https://b.test/rss': () => new Response(RSS),
      })
      expect(result.failed).toStrictEqual([])
      expect(await count()).toBe(2)
      expect(spy.mock.calls.map(([u]) => u)).toStrictEqual([
        'https://a.test/feed',
        'https://a.test/new/feed',
        'https://b.test/rss',
      ])
    })

    it('追う回数が上限（5 回）を超えたら失敗にする', async () => {
      const { result } = await run({
        'https://a.test/feed': () => moved('https://a.test/feed'),
      })
      expect(result.failed).toStrictEqual(['https://a.test/feed'])
    })

    it.each(['file:///etc/passwd', 'https://user:pw@evil.test/rss', 'http://[bad'])(
      '不正な移動先（%s）は失敗にする',
      async (location) => {
        const { result, spy } = await run({ 'https://a.test/feed': () => moved(location) })
        expect(result.failed).toStrictEqual(['https://a.test/feed'])
        expect(spy).toHaveBeenCalledOnce()
      },
    )
  })
})
