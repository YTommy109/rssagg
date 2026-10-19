import type { FC } from 'hono/jsx'

import type { ArticleListItem } from '../db/articles'

const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** 記事の URL はフィード由来で信用できない。javascript: などをリンクにしないよう http(s) だけ通す。 */
function isHttpUrl(url: string): boolean {
  return URL.canParse(url) && /^https?:$/u.test(new URL(url).protocol)
}

const ArticleRow: FC<{ article: ArticleListItem }> = ({ article }) => (
  <li>
    {isHttpUrl(article.url) ? (
      <a href={article.url} rel="noopener noreferrer">
        {article.title}
      </a>
    ) : (
      <span>{article.title}</span>
    )}
    <br />
    <small>
      {article.feed_title ?? article.feed_url} ·{' '}
      <time datetime={new Date(article.at * 1000).toISOString()}>
        {dateFormat.format(article.at * 1000)}
      </time>
    </small>
  </li>
)

export const ArticlesPage: FC<{ articles: ArticleListItem[] }> = ({ articles }) => (
  <section>
    <h1>記事</h1>
    {articles.length === 0 ? (
      <p>
        記事はまだありません。<a href="/settings/feeds">フィード</a>
        を登録すると、次の取得（毎時）で記事が集まります。
      </p>
    ) : (
      <ul>
        {articles.map((article) => (
          <ArticleRow article={article} />
        ))}
      </ul>
    )}
  </section>
)
