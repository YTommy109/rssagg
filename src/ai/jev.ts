import { z } from 'zod'

/**
 * Jev（TypeSafe System One）の呼び出し。使いどころは ADR-0011、呼び方と実測は docs/jev-measurement.md。
 *
 * ここは HTTP の往復だけを受け持つ。何を問うか、答えをどう保存するかは jobs/judge.ts が決める。
 */

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const DEFAULT_MODEL = 'jev-latest'

/** 1 回の呼び出しを打ち切る時間。cron や画面の要求の中で呼ぶので、長く待たない。 */
const TIMEOUT_MS = 30_000

/** 再試行する状態。429 はレート制限、529 は一時的な過負荷で、どちらも時間を置けば通る。 */
const RETRY_STATUSES = new Set([429, 529])

export type JevQuestion =
  | { type: 'noul'; instructions: unknown; criteria?: { true: string; false: string } }
  | { type: 'choice'; instructions: unknown; criteria: Record<string, string | null> }
  | { type: 'score'; instructions: unknown; criteria: string[] }

export type JevRequest = {
  state: unknown
  questions: Record<string, JevQuestion>
  model?: string
}

export type JevOptions = {
  /** 429/529 での再試行の回数。 */
  retries?: number
  /** 最初の待ち時間。以降は倍々に伸ばす。テストでは 0 にする。 */
  baseDelayMs?: number
}

const probabilities = z.record(z.string(), z.number())

const answerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('noul'), noul: z.number() }),
  z.object({
    type: z.literal('choice'),
    choice: z.string(),
    probabilities,
    confidence: z.number(),
  }),
  z.object({ type: z.literal('score'), score: z.number(), probabilities, confidence: z.number() }),
])

const responseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), answerSchema),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
})

export type JevAnswer = z.infer<typeof answerSchema>
export type JevResponse = z.infer<typeof responseSchema>

/** 再試行しても通らなかった、または再試行しない失敗。status で呼び出し側が区別できる。 */
export class JevError extends Error {
  readonly status: number

  constructor(status: number, body: string) {
    super(`Jev: HTTP ${status} ${body.slice(0, 200)}`)
    this.name = 'JevError'
    this.status = status
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * 状態と問いを送り、答えとトークン使用量を返す。
 *
 * 429/529 は指数バックオフで再試行し、それでも通らなければ JevError を投げる。
 * それ以外の失敗（401・4xx・タイムアウト）は再試行せずそのまま投げる。
 */
export async function askJev(
  apiKey: string,
  req: JevRequest,
  opts: JevOptions = {},
): Promise<JevResponse> {
  const { retries = 3, baseDelayMs = 1_000 } = opts
  const init: RequestInit = {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: DEFAULT_MODEL, ...req }),
  }
  /* oxlint-disable no-await-in-loop -- 再試行は前の応答を見てから行うので、逐次にしかならない */
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (res.ok) return responseSchema.parse(await res.json())
    if (!RETRY_STATUSES.has(res.status) || attempt >= retries) {
      throw new JevError(res.status, await res.text())
    }
    await sleep(baseDelayMs * 2 ** attempt)
  }
  /* oxlint-enable no-await-in-loop */
}
