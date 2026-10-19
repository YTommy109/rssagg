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

const GenreChecks: FC<{ name: string; genres: string[]; checked: string[] }> = ({
  name,
  genres,
  checked,
}) => (
  <>
    {genres.map((g) => (
      <label>
        <input type="checkbox" name={name} value={g} checked={checked.includes(g)} /> {g}
      </label>
    ))}
  </>
)

export const ArticlesPage: FC<{
  articles: ArticleListItem[]
  genres: string[]
  include: string[]
  exclude: string[]
}> = ({ articles, genres, include, exclude }) => (
  <section>
    <h1>記事</h1>
    {genres.length > 0 && (
      <form method="get" action="/">
        <fieldset>
          <legend>含める（未選択は全部）</legend>
          <GenreChecks name="include" genres={genres} checked={include} />
        </fieldset>
        <fieldset>
          <legend>除く</legend>
          <GenreChecks name="exclude" genres={genres} checked={exclude} />
        </fieldset>
        <button type="submit">絞り込む</button>{' '}
        <small>ジャンル未設定のフィードの記事は、絞り込んでも隠れません。</small>
      </form>
    )}
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
