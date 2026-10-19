/** feeds テーブルの 1 行。時刻は epoch 秒。 */
export type Feed = {
  id: number
  url: string
  title: string | null
  etag: string | null
  last_modified: string | null
  /** ユーザー定義のジャンル。NULL は未設定。 */
  genre: string | null
  created_at: number
}

const COLUMNS = 'id, url, title, etag, last_modified, genre, created_at'

/**
 * フィードを登録する。同じ URL が既にあれば登録せず undefined を返す。
 *
 * 重複を例外の文言で判別せず済むよう、一意制約の衝突は DO NOTHING で握りつぶし、
 * RETURNING が行を返したかどうかで登録できたかを決める。
 */
export async function insertFeed(
  db: D1Database,
  url: string,
  now: number,
): Promise<Feed | undefined> {
  const row = await db
    .prepare(
      `INSERT INTO feeds (url, created_at) VALUES (?, ?) ON CONFLICT (url) DO NOTHING RETURNING ${COLUMNS}`,
    )
    .bind(url, now)
    .first<Feed>()
  return row ?? undefined
}

/** 登録順（古い順）で全件を返す。 */
export async function listFeeds(db: D1Database): Promise<Feed[]> {
  const { results } = await db.prepare(`SELECT ${COLUMNS} FROM feeds ORDER BY id`).all<Feed>()
  return results
}

/**
 * 取得結果でフィードのタイトルと条件付き GET 用ヘッダを更新する文。
 * 記事の保存と同じ batch に入れるため、実行せず文を返す。
 */
export function updateFeedCacheStatement(
  db: D1Database,
  feed: Pick<Feed, 'id' | 'title' | 'etag' | 'last_modified'>,
): D1PreparedStatement {
  return db
    .prepare(
      'UPDATE feeds SET title = COALESCE(?, title), etag = ?, last_modified = ? WHERE id = ?',
    )
    .bind(feed.title, feed.etag, feed.last_modified, feed.id)
}

/** フィードを削除する。記事などの子は外部キーの連鎖削除で消える。無ければ false。 */
export async function deleteFeed(db: D1Database, id: number): Promise<boolean> {
  const { meta } = await db.prepare('DELETE FROM feeds WHERE id = ?').bind(id).run()
  return meta.changes > 0
}

/** ジャンルを設定する。null で未設定に戻す。フィードが無ければ false。 */
export async function setFeedGenre(
  db: D1Database,
  id: number,
  genre: string | null,
): Promise<boolean> {
  const { meta } = await db.prepare('UPDATE feeds SET genre = ? WHERE id = ?').bind(genre, id).run()
  return meta.changes > 0
}

/** 使われているジャンルの一覧。画面で選ばせて表記ゆれを抑える（ADR-0011）。 */
export async function listGenres(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT DISTINCT genre FROM feeds WHERE genre IS NOT NULL ORDER BY genre')
    .all<{ genre: string }>()
  return results.map((r) => r.genre)
}
