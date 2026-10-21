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
  /** 「後で読む」に入っていれば true。 */
  saved: boolean
  /** 記事単位の Jev 判定で最も確率が高かったジャンル。未判定は null。 */
  judged_genre: string | null
  /** judged_genre の確率（0〜1）。 */
  judged_score: number | null
}

/** D1 は真偽値を 0/1 で返すので、境界でここだけ boolean にする。 */
type ArticleRow = Omit<ArticleListItem, 'saved'> & { saved: number }
const toItem = (r: ArticleRow): ArticleListItem => ({ ...r, saved: r.saved === 1 })

const SELECT_ARTICLE = `SELECT a.id, a.url, a.title, f.title AS feed_title, f.url AS feed_url,
              COALESCE(a.published_at, a.fetched_at) AS at,
              sv.article_id IS NOT NULL AS saved,
              j.topic AS judged_genre, j.score AS judged_score
       FROM articles a JOIN feeds f ON f.id = a.feed_id
       LEFT JOIN saved sv ON sv.article_id = a.id
       LEFT JOIN (SELECT article_id, topic, MAX(score) AS score FROM judgments GROUP BY article_id) j
         ON j.article_id = a.id`

/** 一覧の上限。続きの読み込みは扱わない。 */
export const ARTICLE_LIST_LIMIT = 50

const marks = (xs: string[]) => xs.map(() => '?').join(',')

/** ジャンルによる絞り込み。 */
export type GenreFilter = { include: string[]; exclude: string[] }

/**
 * 新しい順（公開日時、無ければ取得日時）。並びは articles_recent インデックスと同じ式にする。
 *
 * ジャンル未設定のフィードの記事は、include / exclude のどちらでも隠さない（ADR-0011）。
 * include が空なら全ジャンルを通し、exclude は include より優先する。
 * 記事単位の判定があればサイト単位のジャンルより優先する（ADR-0011）。
 */
export async function listRecentArticles(
  db: D1Database,
  filter: GenreFilter,
): Promise<ArticleListItem[]> {
  const conds: string[] = []
  const params: string[] = []
  if (filter.include.length > 0) {
    conds.push(`COALESCE(j.topic, f.genre) IN (${marks(filter.include)})`)
    params.push(...filter.include)
  }
  if (filter.exclude.length > 0) {
    conds.push(`COALESCE(j.topic, f.genre) NOT IN (${marks(filter.exclude)})`)
    params.push(...filter.exclude)
  }
  const where =
    conds.length > 0 ? `WHERE COALESCE(j.topic, f.genre) IS NULL OR (${conds.join(' AND ')})` : ''

  const { results } = await db
    .prepare(
      `${SELECT_ARTICLE}
       ${where}
       ORDER BY at DESC, a.id DESC LIMIT ?`,
    )
    .bind(...params, ARTICLE_LIST_LIMIT)
    .all<ArticleRow>()
  return results.map((r) => toItem(r))
}

/**
 * 保存した記事を、保存した新しい順に返す。件数は絞らない。流れてくる記事と違い、自分で残した
 * ものなので、古い順に見えなくなると取り消すことすらできなくなる。
 */
export async function listSavedArticles(db: D1Database): Promise<ArticleListItem[]> {
  const { results } = await db
    .prepare(
      `${SELECT_ARTICLE} WHERE sv.article_id IS NOT NULL
       ORDER BY sv.saved_at DESC, a.id DESC`,
    )
    .all<ArticleRow>()
  return results.map((r) => toItem(r))
}

/** 記事 1 件。無ければ undefined。 */
export async function getArticle(db: D1Database, id: number): Promise<ArticleListItem | undefined> {
  const row = await db.prepare(`${SELECT_ARTICLE} WHERE a.id = ?`).bind(id).first<ArticleRow>()
  return row === null ? undefined : toItem(row)
}

/**
 * 「後で読む」に入れる。全文の保存は扱わないので archive_key は NULL のまま。
 * 記事が無ければ何もしない（外部キー違反にせず、呼び出し側が getArticle で確かめる）。
 */
export async function saveArticle(db: D1Database, id: number, now: number): Promise<void> {
  await db
    .prepare(
      'INSERT INTO saved (article_id, saved_at) SELECT id, ? FROM articles WHERE id = ? ON CONFLICT DO NOTHING',
    )
    .bind(now, id)
    .run()
}

export async function unsaveArticle(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM saved WHERE article_id = ?').bind(id).run()
}

/** Jev に渡す記事の中身。一覧の行は excerpt を持たないので別に引く。 */
export async function getJudgeTarget(
  db: D1Database,
  id: number,
): Promise<{ id: number; title: string; excerpt: string | null } | undefined> {
  const row = await db
    .prepare('SELECT id, title, excerpt FROM articles WHERE id = ?')
    .bind(id)
    .first<{ id: number; title: string; excerpt: string | null }>()
  return row ?? undefined
}

/**
 * 「記事ごとに判定する」フィードの未判定の記事を、取り込んだ順（古い順）に limit 件返す。
 * 新しい順だと、流入が limit を超え続けたときに古い記事へ届かない。
 *
 * 判定に失敗した記事は、最後の失敗から 1 時間 × 2^(失敗回数 - 1)（上限 64 時間）経つまで選ばない。
 * 毎回失敗する記事が枠を占め続けたり、Jev を毎時呼び続けたりしないため。
 */
export async function listUnjudgedArticles(
  db: D1Database,
  limit: number,
  now: number,
): Promise<{ id: number; title: string; excerpt: string | null }[]> {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.title, a.excerpt FROM articles a JOIN feeds f ON f.id = a.feed_id
       WHERE f.judge_each = 1
         AND NOT EXISTS (SELECT 1 FROM judgments j WHERE j.article_id = a.id)
         AND (a.judge_failures = 0 OR a.judge_failed_at + (3600 << min(a.judge_failures - 1, 6)) <= ?)
       ORDER BY a.id LIMIT ?`,
    )
    .bind(now, limit)
    .all<{ id: number; title: string; excerpt: string | null }>()
  return results
}

/** クロール後の判定に失敗した記事の失敗回数を 1 増やし、失敗時刻を記録する。 */
export async function recordJudgeFailures(
  db: D1Database,
  ids: number[],
  now: number,
): Promise<void> {
  if (ids.length === 0) return
  const stmt = db.prepare(
    'UPDATE articles SET judge_failures = judge_failures + 1, judge_failed_at = ? WHERE id = ?',
  )
  await db.batch(ids.map((id) => stmt.bind(now, id)))
}
