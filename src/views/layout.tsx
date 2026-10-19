import { html } from 'hono/html'
import type { Child, FC, PropsWithChildren } from 'hono/jsx'

// htmx は既定で 4xx/5xx を差し替えない。登録・ジャンル変更の失敗（422 不正・409 重複・404 消えたフィード）は
// 理由を画面に出したいので、この 4 つだけ差し替える（502 は今すぐ取得と、登録時の取得の失敗）。error を立てるのは、失敗なのに successful になって
// 入力欄が消えるのを防ぐため。それ以外の 4xx/5xx は、エラー文が一覧などに混ざらないよう差し替えない。
const HTMX_CONFIG = JSON.stringify({
  responseHandling: [
    { code: '204', swap: false },
    { code: '[23]..', swap: true },
    { code: '404|409|422|502', swap: true, error: true },
    { code: '[45]..', swap: false, error: true },
  ],
})

// 空の一覧に何も出ないと、読み込めていないのか空なのか区別できない。
// <style> は生テキストなので、JSX の子にすると引用符が &quot; になり CSS が壊れる。
// 値は定数で利用者の入力を含まないため、dangerouslySetInnerHTML で生のまま渡す。
const EMPTY_LIST_CSS =
  '#feed-list:empty::before { content: "まだ登録されていません"; color: gray; }'

const Layout: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <meta name="htmx-config" content={HTMX_CONFIG} />
      <style dangerouslySetInnerHTML={{ __html: EMPTY_LIST_CSS }} />
      <link rel="stylesheet" href="/static/lism.css" />
      <script src="/static/htmx.js" defer />
    </head>
    <body>
      <header>
        <strong>
          <a href="/">rssagg</a>
        </strong>{' '}
        <nav style="display: inline">
          <a href="/articles/saved">後で読む</a> <a href="/settings/feeds">フィード</a>
        </nav>
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
