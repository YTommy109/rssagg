import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { crawlAll } from '../src/crawl/crawl'
import { parseFeed } from '../src/crawl/parse'

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>
<item><title>A</title><link>https://a.test/1</link><guid>g1</guid><pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate><description>&lt;p&gt;hello&lt;/p&gt;</description></item>
<item><title>B</title><link>https://a.test/2</link></item></channel></rss>`
const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><title>At</title>
<entry><title>E</title><id>urn:e1</id><link rel="alternate" href="https://b.test/e1"/><updated>2025-01-01T00:00:00Z</updated><summary>s</summary></entry></feed>`

describe('parseFeed', () => {
  it('RSS: guid が無ければ URL を識別子にし、本文のタグは抜粋から落とす', () => {
    const f = parseFeed(RSS)
    expect(f.title).toBe('Blog')
    expect(f.items.map((i) => i.guid)).toStrictEqual(['g1', 'https://a.test/2'])
    expect(f.items[0]).toMatchObject({ excerpt: 'hello', publishedAt: 1_735_689_600 })
  })

  it('Atom: link の href と id を読む', () => {
    expect(parseFeed(ATOM).items[0]).toMatchObject({
      guid: 'urn:e1',
      url: 'https://b.test/e1',
      publishedAt: 1_735_689_600,
    })
  })

  it('フィードでない XML は例外', () => {
    expect(() => parseFeed('<html/>')).toThrow('RSS でも Atom でもない')
  })
})

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
})
