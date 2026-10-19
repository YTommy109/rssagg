import { askJev } from '../ai/jev'
import { isJudged, saveJudgments } from '../db/judgments'

/** 判定に渡す記事。本文は持たないので、分類は title と excerpt で行う（docs/jev-measurement.md）。 */
export type JudgeTarget = { id: number; title: string; excerpt: string | null }

export type JudgeResult = {
  /** API キーやジャンルが無く、判定そのものを行わなかった。 */
  skipped: boolean
  judged: number[]
  failed: number[]
}

/*
 * ジャンルのどれにも当てはまらないときの選択肢。保存はしない（judgments.topic はジャンルの語彙と共有する）。
 * ponytail: ユーザーが同名のジャンルを作ると区別できない。問題になったら予約語として入力側で弾く。
 */
const NONE = '該当なし'

const SKIPPED: JudgeResult = { skipped: true, judged: [], failed: [] }

/** 1 記事をジャンルの choice で問い、ジャンルごとの確率を返す。 */
async function judgeOne(
  apiKey: string,
  article: JudgeTarget,
  genres: string[],
): Promise<Record<string, number>> {
  const criteria = Object.fromEntries<string | null>(genres.map((g) => [g, null]))
  criteria[NONE] = 'どのジャンルにも当てはまらない'
  const { answers } = await askJev(apiKey, {
    state: { title: article.title, excerpt: article.excerpt },
    questions: {
      genre: {
        type: 'choice',
        instructions: `記事 \`title\` と \`excerpt\` が属するジャンルを選ぶ。どれにも当てはまらなければ「${NONE}」。`,
        criteria,
      },
    },
  })
  const answer = answers['genre']
  if (answer?.type !== 'choice') throw new Error('Jev: choice の答えが返らなかった')
  return Object.fromEntries(Object.entries(answer.probabilities).filter(([t]) => t !== NONE))
}

/**
 * 記事をジャンルで判定し、judgments に保存する。Jev を使う機能（TASK-22〜24）の共通部分。
 *
 * - API キーかジャンルが無ければ、警告を出して判定を飛ばす（skipped）
 * - 判定済みの記事は再判定しない
 * - 1 件の失敗は記録して残りを続け、呼び出し側へは投げない。取り込みや画面を止めないため
 *
 * レート制限に当たりにくいよう、記事ごとに逐次で呼ぶ。
 */
export async function judgeArticles(
  deps: { db: D1Database; apiKey: string | undefined },
  input: { articles: JudgeTarget[]; genres: string[]; now: number },
): Promise<JudgeResult> {
  // 未登録の Secret は env に無い（undefined）。空文字と同じく判定を飛ばす。
  if (!deps.apiKey) {
    console.warn('JEV_API_KEY が未設定のため、Jev の判定を飛ばした')
    return SKIPPED
  }
  if (input.genres.length === 0) {
    console.warn('ジャンルが 1 つも無いため、Jev の判定を飛ばした')
    return SKIPPED
  }

  const judged: number[] = []
  const failed: number[] = []
  /* oxlint-disable no-await-in-loop -- レート制限を避けるため、記事ごとに逐次で呼ぶ */
  for (const article of input.articles) {
    try {
      if (await isJudged(deps.db, article.id)) continue
      const scores = await judgeOne(deps.apiKey, article, input.genres)
      await saveJudgments(deps.db, article.id, scores, input.now)
      judged.push(article.id)
    } catch (error) {
      console.error(`judge failed: article ${article.id}`, error)
      failed.push(article.id)
    }
  }
  /* oxlint-enable no-await-in-loop */
  return { skipped: false, judged, failed }
}
