import { feedUrlSchema } from './feed-input'

/** HTML ページに埋め込まれたフィードの候補。title は無いことがある。 */
export type FeedCandidate = { url: string; title: string | null }

const HTML_HEAD_RE = /^\s*<(?:!doctype\s+html|html)\b/iu
const FEED_TYPE_RE = /^application\/(?:rss|atom)\+xml\b/iu

/** Content-Type か本文の先頭で HTML と判定する。それ以外はフィード（XML）として扱う。 */
export function looksLikeHtml(text: string, contentType: string | null): boolean {
  return /\bhtml\b/iu.test(contentType ?? '') || HTML_HEAD_RE.test(text.slice(0, 200))
}

/** rel に alternate を含み、type が RSS / Atom の <link> か。 */
function isFeedLink(el: Element): boolean {
  const rel = (el.getAttribute('rel') ?? '').toLowerCase().split(/\s+/u)
  return rel.includes('alternate') && FEED_TYPE_RE.test(el.getAttribute('type')?.trim() ?? '')
}

/** <link> 1 つが RSS / Atom の alternate なら候補にする。URL は pageUrl を基準に絶対化して検査する。 */
function toCandidate(el: Element, pageUrl: string): FeedCandidate | null {
  const href = el.getAttribute('href')
  if (!isFeedLink(el) || href === null || !URL.canParse(href, pageUrl)) return null
  const url = feedUrlSchema.safeParse(new URL(href, pageUrl).href)
  if (!url.success) return null
  const title = el.getAttribute('title')?.trim()
  return { url: url.data, title: title === undefined || title === '' ? null : title }
}

/**
 * HTML の <link rel="alternate"> から RSS / Atom の URL を集める。feedUrlSchema に通らないもの
 * （http/https 以外など）と重複は捨てる。
 */
export async function findFeedLinks(html: string, pageUrl: string): Promise<FeedCandidate[]> {
  const found = new Map<string, FeedCandidate>()
  await new HTMLRewriter()
    .on('link', {
      element(el) {
        const candidate = toCandidate(el, pageUrl)
        if (candidate !== null && !found.has(candidate.url)) found.set(candidate.url, candidate)
      },
    })
    // rewriter は出力を読んだときに走るので、本文を最後まで読み切る。
    .transform(new Response(html))
    .text()
  return [...found.values()]
}
