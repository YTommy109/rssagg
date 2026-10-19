import type { FC } from 'hono/jsx'

import type { Feed } from '../db/feeds'

/**
 * 一覧の 1 行。登録の応答でもそのまま返し、htmx が一覧の末尾へ足す。
 * 削除は取り込み済みの記事も連鎖して消すため、確認を挟む。
 */
export const FeedRow: FC<{ feed: Feed }> = ({ feed }) => (
  <li id={`feed-${feed.id}`}>
    <span>{feed.title ?? feed.url}</span>{' '}
    {/* 変更したら送る。空にすると未設定に戻り、記事一覧の絞り込みの対象外になる。
        応答の本体は使わず、候補（#genres）と失敗表示（#form-error）を out-of-band で受け取る。 */}
    <input
      type="text"
      name="genre"
      list="genres"
      aria-label="ジャンル"
      placeholder="ジャンル未設定"
      maxlength={50}
      value={feed.genre ?? ''}
      hx-put={`/settings/feeds/${feed.id}/genre`}
      hx-trigger="change"
      hx-swap="none"
    />{' '}
    <button
      type="button"
      hx-delete={`/settings/feeds/${feed.id}`}
      hx-target="closest li"
      hx-swap="outerHTML"
      hx-confirm="このフィードと、取り込み済みの記事を削除しますか？"
    >
      削除
    </button>
  </li>
)

/** 前回の失敗の表示を消す（out-of-band）。 */
const ClearError: FC = () => <p id="form-error" role="alert" hx-swap-oob="true" />

/** 登録に成功したときの応答。行を足し、前回の失敗の表示を消す。 */
export const AddedFeed: FC<{ feed: Feed }> = ({ feed }) => (
  <>
    <FeedRow feed={feed} />
    <ClearError />
  </>
)

/** ジャンル入力の候補。既存の表記を選ばせて、表記ゆれを増やさない（ADR-0011）。 */
const GenreOptions: FC<{ genres: string[]; oob?: boolean }> = ({ genres, oob }) => (
  <datalist id="genres" hx-swap-oob={oob ? 'true' : undefined}>
    {genres.map((g) => (
      <option value={g} />
    ))}
  </datalist>
)

/** ジャンルの保存に成功したときの応答。候補を今の一覧に入れ替え、前回の失敗の表示を消す。 */
export const GenreSaved: FC<{ genres: string[] }> = ({ genres }) => (
  <>
    <GenreOptions genres={genres} oob />
    <ClearError />
  </>
)

export const FeedsPage: FC<{ feeds: Feed[]; genres: string[] }> = ({ feeds, genres }) => (
  <section>
    <h1>フィード</h1>
    {/* 入力の検証は常にサーバーが行い、理由を #form-error に出す。type="url" にしないのは、
        ブラウザの検証が先に働いて、サーバー側の理由（http/https のみなど）が出なくなるため。 */}
    <form
      hx-post="/settings/feeds"
      hx-target="#feed-list"
      hx-swap="beforeend"
      hx-on--after-request="if (event.detail.successful) this.reset()"
    >
      <input
        type="text"
        name="url"
        aria-label="フィードの URL"
        inputmode="url"
        required
        placeholder="https://example.com/feed.xml"
        size={48}
      />{' '}
      <button type="submit">登録</button>
    </form>
    <p id="form-error" role="alert" />
    <GenreOptions genres={genres} />
    <ul id="feed-list">
      {feeds.map((feed) => (
        <FeedRow feed={feed} />
      ))}
    </ul>
  </section>
)
