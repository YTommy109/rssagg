import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { crawlAll } from '../src/jobs/crawl'

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
})
