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
