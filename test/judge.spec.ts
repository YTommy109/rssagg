import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { z } from 'zod'

import { listRecentArticles } from '../src/db/articles'
import { judgeArticles } from '../src/jobs/judge'

const NOW = 1_800_000_000
const GENRES = ['sports', 'tech']
const ARTICLES = [
  { id: 1, title: 'A', excerpt: 'a' },
  { id: 2, title: 'B', excerpt: null },
  { id: 3, title: 'bad', excerpt: null },
]

/** fetch に渡した JSON 本体のうち、テストで見る部分。 */
const sentSchema = z.object({
  state: z.object({ title: z.string(), excerpt: z.string().nullable() }),
  questions: z.object({ genre: z.object({ criteria: z.record(z.string(), z.unknown()) }) }),
})
const sent = (init?: RequestInit) =>
  sentSchema.parse(JSON.parse(typeof init?.body === 'string' ? init.body : 'null'))

const choice = (probabilities: Record<string, number>) => ({
  model: 'jev-1.13.0',
  answers: { genre: { type: 'choice', choice: 'tech', probabilities, confidence: 0.8 } },
  usage: { input_tokens: 10, output_tokens: 1 },
})

/** 記事 bad だけ失敗させ、他は tech 寄りの確率を返す。 */
function mockJev() {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((_input, init) =>
      Promise.resolve(
        sent(init).state.title === 'bad'
          ? new Response('boom', { status: 500 })
          : new Response(JSON.stringify(choice({ tech: 0.7, sports: 0.2, 該当なし: 0.1 }))),
      ),
    )
}

describe('judgeArticles', () => {
  let warn: MockInstance

  beforeEach(async () => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await env.DB.batch([
      env.DB.prepare("INSERT INTO feeds (id, url, created_at) VALUES (1, 'https://a.test/f', 0)"),
      ...ARTICLES.map((a) =>
        env.DB.prepare(
          'INSERT INTO articles (id, feed_id, guid, url, title, fetched_at) VALUES (?, 1, ?, ?, ?, 0)',
        ).bind(a.id, `g${a.id}`, `https://a.test/${a.id}`, a.title),
      ),
      // 記事 2 は判定済み。
      env.DB.prepare(
        "INSERT INTO judgments (article_id, topic, score, judged_at) VALUES (2, 'sports', 1, 1)",
      ),
    ])
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  const rows = async () =>
    (
      await env.DB.prepare(
        'SELECT article_id, topic, score, judged_at FROM judgments ORDER BY article_id, topic',
      ).all()
    ).results

  it('判定済みは飛ばし、失敗した記事があっても残りを保存して報告する', async () => {
    const spy = mockJev()
    const result = await judgeArticles(
      { db: env.DB, apiKey: 'key' },
      { articles: ARTICLES, genres: GENRES, now: NOW },
    )
    expect(result).toStrictEqual({ skipped: false, judged: [1], failed: [3] })
    expect(spy).toHaveBeenCalledTimes(2)

    // 「該当なし」も他のジャンルと同じく保存する。判定済みの記事 2 はそのまま。
    expect(await rows()).toStrictEqual([
      { article_id: 1, topic: 'sports', score: 0.2, judged_at: NOW },
      { article_id: 1, topic: 'tech', score: 0.7, judged_at: NOW },
      { article_id: 1, topic: '該当なし', score: 0.1, judged_at: NOW },
      { article_id: 2, topic: 'sports', score: 1, judged_at: 1 },
    ])

    // 状態は title と excerpt、選択肢はジャンルと「該当なし」。
    const body = sent(spy.mock.calls[0]?.[1])
    expect(body.state).toStrictEqual({ title: 'A', excerpt: 'a' })
    expect(Object.keys(body.questions.genre.criteria)).toStrictEqual(['sports', 'tech', '該当なし'])
  })

  it('「該当なし」が最大の記事は該当なしとして残り、低いジャンルで一覧に出ず、再判定もしない', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(choice({ 該当なし: 0.9, tech: 0.06, sports: 0.04 }))),
      )
    const deps = { db: env.DB, apiKey: 'key' }
    const input = { articles: ARTICLES.slice(0, 1), genres: GENRES, now: NOW }
    expect((await judgeArticles(deps, input)).judged).toStrictEqual([1])

    const shown = async (include: string[]) =>
      (await listRecentArticles(env.DB, { include, exclude: [] })).find((a) => a.id === 1)
    expect(await shown(['tech'])).toBeUndefined()
    expect(await shown([])).toMatchObject({ judged_genre: '該当なし', judged_score: 0.9 })

    expect((await judgeArticles(deps, input)).judged).toStrictEqual([])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('API キーが空か未登録なら警告を出して判定を飛ばし、Jev を呼ばない', async () => {
    const spy = mockJev()
    for (const apiKey of ['', undefined]) {
      const result = await judgeArticles(
        { db: env.DB, apiKey },
        { articles: ARTICLES, genres: GENRES, now: NOW },
      )
      expect(result).toStrictEqual({ skipped: true, judged: [], failed: [] })
    }
    expect(spy).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('ジャンルが無ければ判定を飛ばす', async () => {
    const spy = mockJev()
    const result = await judgeArticles(
      { db: env.DB, apiKey: 'key' },
      { articles: ARTICLES, genres: [], now: NOW },
    )
    expect(result.skipped).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
