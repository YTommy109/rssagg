/**
 * 判定済みか。topic を問わず 1 行でもあれば判定済みとみなす。
 *
 * ジャンルが後から増えても再判定しない。再判定の要否は呼び出し側（TASK-22〜24）が決め、
 * 必要なら先に行を消す。
 */
export async function isJudged(db: D1Database, articleId: number): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM judgments WHERE article_id = ? LIMIT 1')
    .bind(articleId)
    .first()
  return row !== null
}

/** 1 記事分の topic ごとの score を 1 バッチで保存する。途中で失敗しても半端な行は残らない。 */
export async function saveJudgments(
  db: D1Database,
  articleId: number,
  scores: Record<string, number>,
  judgedAt: number,
): Promise<void> {
  const entries = Object.entries(scores)
  if (entries.length === 0) return
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO judgments (article_id, topic, score, judged_at) VALUES (?, ?, ?, ?)',
  )
  await db.batch(entries.map(([topic, score]) => stmt.bind(articleId, topic, score, judgedAt)))
}
