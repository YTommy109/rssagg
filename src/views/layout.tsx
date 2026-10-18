import { html } from 'hono/html'
import type { Child, FC, PropsWithChildren } from 'hono/jsx'

// ADR-0010: 版を固定して SRI で検証する。版を上げるときは URL と SRI を同時に更新する。
const HTMX_URL = 'https://cdn.jsdelivr.net/npm/htmx.org@2.0.11/dist/htmx.min.js'
const HTMX_INTEGRITY = 'sha384-2OatzQy1H+Zd/IIrjr1TcuDGqLXeHhbooAyJY1KdQMKnr4LZ22k31GBLdYKHmVjg'

const Layout: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <script src={HTMX_URL} integrity={HTMX_INTEGRITY} crossorigin="anonymous" defer />
    </head>
    <body>
      <header>
        <strong>rssagg</strong>
      </header>
      <main>{children}</main>
    </body>
  </html>
)

/**
 * 共通レイアウトに包んだ 1 ページ分の HTML を返す。
 *
 * JSX だけでは doctype が付かず、ブラウザが quirks モードで描画するため、ここで付ける。
 * htmx で差し替える断片は doctype もレイアウトも要らないので、これを通さず JSX を直接返す。
 */
export function page(title: string, children: Child) {
  return html`<!DOCTYPE html>${<Layout title={title}>{children}</Layout>}`
}
