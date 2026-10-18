import type { FC } from 'hono/jsx'

import type { Feed } from '../db/feeds'

/**
 * 一覧の 1 行。登録の応答でもそのまま返し、htmx が一覧の末尾へ足す。
 * 削除は取り込み済みの記事も連鎖して消すため、確認を挟む。
 */
export const FeedRow: FC<{ feed: Feed }> = ({ feed }) => (
  <li id={`feed-${feed.id}`}>
    <span>{feed.title ?? feed.url}</span>{' '}
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

/** 登録に成功したときの応答。行を足し、前回の失敗の表示を消す（out-of-band）。 */
export const AddedFeed: FC<{ feed: Feed }> = ({ feed }) => (
  <>
    <FeedRow feed={feed} />
    <p id="form-error" role="alert" hx-swap-oob="true" />
  </>
)

export const FeedsPage: FC<{ feeds: Feed[] }> = ({ feeds }) => (
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
    <ul id="feed-list">
      {feeds.map((feed) => (
        <FeedRow feed={feed} />
      ))}
    </ul>
  </section>
)
