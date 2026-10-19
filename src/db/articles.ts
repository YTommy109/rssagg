import type { ParsedItem } from '../domain/feed-parse'

/**
 * 取得した記事を保存する文。呼び出し側がまとめて batch に入れる。
 *
 * 記事は (feed_id, guid) と url の一意制約で二重登録を避ける。後者は別のフィードが
 * 同じ記事を配信した場合で、先に取得した方を残す。既存の記事は上書きしない
 * （既読や判定の紐付けを壊さないため）。
 */
export function insertArticleStatements(
  db: D1Database,
  feedId: number,
  items: ParsedItem[],
  now: number,
): D1PreparedStatement[] {
  const insert = db.prepare(
    `INSERT INTO articles (feed_id, guid, url, title, excerpt, published_at, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
  )
  return items.map((i) =>
    insert.bind(feedId, i.guid, i.url, i.title, i.excerpt, i.publishedAt, now),
  )
}

/** 一覧に出す記事 1 件。時刻は epoch 秒。 */
export type ArticleListItem = {
  id: number
  url: string
  title: string
  feed_title: string | null
  feed_url: string
  /** 公開日時。無いフィードは取得日時で代用済み。 */
  at: number
}

/** 一覧の上限。続きの読み込みは扱わない。 */
export const ARTICLE_LIST_LIMIT = 50

/** 新しい順（公開日時、無ければ取得日時）。並びは articles_recent インデックスと同じ式にする。 */
export async function listRecentArticles(db: D1Database): Promise<ArticleListItem[]> {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.url, a.title, f.title AS feed_title, f.url AS feed_url,
              COALESCE(a.published_at, a.fetched_at) AS at
       FROM articles a JOIN feeds f ON f.id = a.feed_id
       ORDER BY at DESC, a.id DESC LIMIT ?`,
    )
    .bind(ARTICLE_LIST_LIMIT)
    .all<ArticleListItem>()
  return results
}
