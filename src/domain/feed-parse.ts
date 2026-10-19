import { XMLParser } from 'fast-xml-parser'

/** パース済みの記事 1 件。時刻は epoch 秒。 */
export type ParsedItem = {
  guid: string
  url: string
  title: string
  excerpt: string | null
  publishedAt: number | null
}

export type ParsedFeed = { title: string | null; items: ParsedItem[] }

const EXCERPT_MAX = 300

// Atom の link は属性、RSS の link は本文なので、属性も要素として同じ木に載せる。
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // 記事内の数字（guid など）を number にされると先頭の 0 が落ちる。
  parseTagValue: false,
  processEntities: true,
})

type Node = Record<string, unknown>

function isNode(v: unknown): v is Node {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asArray(v: unknown): unknown[] {
  if (v === undefined) return []
  return Array.isArray(v) ? v : [v]
}

/** 要素の文字列値。`<title type="html">x</title>` のように属性があると { '#text': 'x' } になる。 */
function text(v: unknown): string | null {
  const raw: unknown = Array.isArray(v) ? v[0] : v
  const s = isNode(raw) ? raw['#text'] : raw
  return typeof s === 'string' && s.trim() !== '' ? s.trim() : null
}

/** 先頭から順に、値のある要素の文字列を返す。 */
function firstText(n: Node, ...keys: string[]): string | null {
  for (const k of keys) {
    const s = text(n[k])
    if (s !== null) return s
  }
  return null
}

/** Atom の link は複数あり得る。rel が無いか alternate のものを記事の URL とする。 */
function atomLink(v: unknown): string | null {
  for (const l of asArray(v)) {
    if (isNode(l) && (l['@_rel'] === undefined || l['@_rel'] === 'alternate')) {
      return text(l['@_href'])
    }
  }
  return null
}

function toEpoch(s: string | null): number | null {
  if (s === null) return null
  const ms = Date.parse(s)
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000)
}

/** 本文は保存しないので、タグを落として先頭だけ抜粋にする。 */
function toExcerpt(s: string | null): string | null {
  if (s === null) return null
  const plain = s
    .replaceAll(/<[^>]*>/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim()
  return plain === '' ? null : plain.slice(0, EXCERPT_MAX)
}

/** RSS の guid は isPermaLink が false でなければ記事の URL でもある。link の無いフィードはこれを URL にする。 */
function guidPermalink(v: unknown): string | null {
  const raw: unknown = Array.isArray(v) ? v[0] : v
  if (isNode(raw) && raw['@_isPermaLink'] === 'false') return null
  const s = text(v)
  return s !== null && /^https?:\/\//u.test(s) ? s : null
}

function toItem(n: Node): ParsedItem | null {
  const url = text(n['link']) ?? atomLink(n['link']) ?? guidPermalink(n['guid'])
  // guid が無いフィードは URL を識別子にする。URL も無い項目は記事として扱えない。
  const guid = firstText(n, 'guid', 'id') ?? url
  if (url === null || guid === null) return null
  return {
    guid,
    url,
    title: text(n['title']) ?? url,
    excerpt: toExcerpt(firstText(n, 'description', 'summary', 'content')),
    publishedAt: toEpoch(firstText(n, 'pubDate', 'published', 'updated', 'dc:date')),
  }
}

const CHARSET_RE = /charset=["']?([\w.:-]+)/iu
const XML_ENCODING_RE = /^\s*<\?xml[^>]*encoding=["']([\w.:-]+)/iu

/**
 * 取得した本文を文字列にする。Shift_JIS や EUC-JP のフィードを UTF-8 として読むと
 * 文字化けしたタイトルがそのまま保存されるので、Content-Type の charset、無ければ
 * XML 宣言の encoding で復号する。どちらも無いか未知の名前なら UTF-8。
 */
export function decodeFeedBytes(bytes: Uint8Array, contentType: string | null): string {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200))
  const label = CHARSET_RE.exec(contentType ?? '')?.[1] ?? XML_ENCODING_RE.exec(head)?.[1]
  let decoder: TextDecoder
  try {
    decoder = new TextDecoder(label ?? 'utf-8')
  } catch {
    decoder = new TextDecoder()
  }
  return decoder.decode(bytes)
}

/** RSS 2.0 / Atom 1.0 を解釈する。どちらでもなければ例外。 */
export function parseFeed(xml: string): ParsedFeed {
  const doc: unknown = parser.parse(xml)
  const top = isNode(doc) ? doc : {}
  const rss = isNode(top['rss']) ? top['rss'] : undefined
  const root = isNode(rss?.['channel']) ? rss['channel'] : top['feed']
  if (!isNode(root)) throw new Error('RSS でも Atom でもない')
  const items = asArray(rss ? root['item'] : root['entry'])
    .filter((v) => isNode(v))
    .map((n) => toItem(n))
    .filter((i) => i !== null)
  return { title: text(root['title']), items }
}
