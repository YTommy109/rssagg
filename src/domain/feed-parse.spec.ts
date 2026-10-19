import { describe, expect, it } from 'vitest'

import { decodeFeedBytes, parseFeed } from './feed-parse'

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>
<item><title>A</title><link>https://a.test/1</link><guid>g1</guid><pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate><description>&lt;p&gt;hello&lt;/p&gt;</description></item>
<item><title>B</title><link>https://a.test/2</link></item>
<item><title>C</title><guid>https://a.test/3</guid></item>
<item><title>D</title><guid isPermaLink="false">https://a.test/4</guid></item></channel></rss>`
const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><title>At</title>
<entry><title>E</title><id>urn:e1</id><link rel="self" href="https://b.test/feed"/><link rel="alternate" href="https://b.test/e1"/><updated>2025-01-01T00:00:00Z</updated><summary>s</summary></entry></feed>`

describe('parseFeed', () => {
  it('RSS: guid が無ければ URL を、link が無ければ permalink の guid を使い、本文のタグは抜粋から落とす', () => {
    const f = parseFeed(RSS)
    expect(f.title).toBe('Blog')
    expect(f.items.map((i) => [i.guid, i.url])).toStrictEqual([
      ['g1', 'https://a.test/1'],
      ['https://a.test/2', 'https://a.test/2'],
      ['https://a.test/3', 'https://a.test/3'],
    ])
    expect(f.items[0]).toMatchObject({ excerpt: 'hello', publishedAt: 1_735_689_600 })
  })

  it('Atom: rel=alternate の link の href と id を読む', () => {
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

describe('decodeFeedBytes', () => {
  // Shift_JIS の「あ」
  const SJIS_A = [0x82, 0xa0]
  const bytes = (head: string, tail: number[]) =>
    new Uint8Array([...new TextEncoder().encode(head), ...tail])

  it('Content-Type の charset を優先し、無ければ XML 宣言の encoding で復号する', () => {
    expect(decodeFeedBytes(bytes('<x>', SJIS_A), 'text/xml; charset=Shift_JIS')).toBe('<x>あ')
    expect(decodeFeedBytes(bytes('<?xml version="1.0" encoding="Shift_JIS"?>', SJIS_A), null)).toBe(
      '<?xml version="1.0" encoding="Shift_JIS"?>あ',
    )
  })

  it('未知の名前や指定なしは UTF-8 として読む', () => {
    const utf8 = new TextEncoder().encode('あ')
    expect(decodeFeedBytes(utf8, 'text/xml; charset=nope')).toBe('あ')
    expect(decodeFeedBytes(utf8, null)).toBe('あ')
  })
})
