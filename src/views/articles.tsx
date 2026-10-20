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

const JudgeStatus: FC<{ article: ArticleListItem; note?: 'failed' | 'no_genres' | undefined }> = ({
  article,
  note,
}) => (
  <>
    {article.judged_genre === null ? (
      <button
        type="button"
        hx-post={`/articles/${article.id}/judgment`}
        hx-target="closest li"
        hx-swap="outerHTML"
      >
        判定する
      </button>
    ) : (
      <small>
        ジャンル: {article.judged_genre}（{Math.round((article.judged_score ?? 0) * 100)}%）
      </small>
    )}
    {note === 'failed' && <small> 判定に失敗しました。時間を置いて再度お試しください。</small>}
    {note === 'no_genres' && (
      <small>
        {' '}
        ジャンルが未設定です。<a href="/settings/feeds">フィード</a>にジャンルを設定してください。
      </small>
    )}
  </>
)

/**
 * `inSaved` は保存一覧での表示。取り消したら、行を差し替えずに消す（一覧は「保存した記事だけ」のため）。
 */
export const ArticleRow: FC<{
  article: ArticleListItem
  inSaved?: boolean
  judge?: 'failed' | 'no_genres' | undefined
}> = ({ article, inSaved, judge }) => (
  <li id={`article-${article.id}`}>
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
    </small>{' '}
    {/* 押すたびに行ごと差し替える。保存済みかどうかは行の表示だけで分かる。 */}
    {article.saved ? (
      <button
        type="button"
        hx-delete={`/articles/${article.id}/saved`}
        hx-target="closest li"
        hx-swap={inSaved === true ? 'delete' : 'outerHTML'}
      >
        ★ 保存済み（取り消す）
      </button>
    ) : (
      <button
        type="button"
        hx-put={`/articles/${article.id}/saved`}
        hx-target="closest li"
        hx-swap="outerHTML"
      >
        ☆ 後で読む
      </button>
    )}{' '}
    <JudgeStatus article={article} note={judge} />
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

export const SavedPage: FC<{ articles: ArticleListItem[] }> = ({ articles }) => (
  <section>
    <h1>後で読む</h1>
    {articles.length === 0 ? (
      <p>
        保存した記事はまだありません。<a href="/">記事一覧</a>の「後で読む」で保存できます。
      </p>
    ) : (
      <ul>
        {articles.map((article) => (
          <ArticleRow article={article} inSaved />
        ))}
      </ul>
    )}
  </section>
)
