import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { crawlAll } from '../src/jobs/crawl'
import { JUDGE_LIMIT_PER_CRAWL, judgePending } from '../src/jobs/judge'
import { installAccessKeys, removeAccessKeys } from './access-helpers'

const NOW = 1_800_000_000

const TECH = { tech: 0.8, sports: 0.1, 該当なし: 0.1 }

const jevOk = (probabilities: Record<string, number> = TECH) =>
  new Response(
    JSON.stringify({
      model: 'jev-1',
      answers: {
        genre: {
          type: 'choice',
          choice: 'tech',
          probabilities,
          confidence: 0.9,
        },
      },
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  )

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>
<item><title>新着</title><link>https://a.test/new</link><guid>gnew</guid></item></channel></rss>`

/** Jev の呼び出し先とそれ以外（フィード取得）を振り分ける。jev にはリクエスト本文を渡す。 */
function mockFetch(jev: (body: string) => Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const req = new Request(input, init)
    return req.url.includes('api.typesafe.ai') ? jev(await req.text()) : new Response(RSS)
  })
}

const HOUR = 3600

const judgedIds = async () =>
  (
    await env.DB.prepare('SELECT DISTINCT article_id AS id FROM judgments ORDER BY 1').all<{
      id: number
    }>()
  ).results.map((r) => r.id)

describe('記事ごとの判定（クロール時）', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await env.DB.batch([
      // 1: 判定する / 2: 判定しない
      env.DB.prepare(
        "INSERT INTO feeds (id, url, genre, judge_each, created_at) VALUES (1, 'https://a.test/feed', 'tech', 1, 0), (2, 'https://b.test/feed', 'sports', 0, 0)",
      ),
      env.DB.prepare(
        `INSERT INTO articles (id, feed_id, guid, url, title, fetched_at) VALUES
         (1, 1, 'g1', 'https://a.test/1', 'A', 100), (2, 2, 'g2', 'https://b.test/2', 'B', 100)`,
      ),
    ])
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  it('設定したフィードの記事だけを判定し、結果は一覧の絞り込みに使われる行として残る', async () => {
    const fetchMock = mockFetch(() => jevOk())
    await judgePending({ db: env.DB, apiKey: 'k' }, NOW)
    expect(await judgedIds()).toStrictEqual([1])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('「該当なし」が最大の記事は判定済みになり、次の周期で選ばれない', async () => {
    const fetchMock = mockFetch(() => jevOk({ 該当なし: 0.9, tech: 0.06, sports: 0.04 }))
    await judgePending({ db: env.DB, apiKey: 'k' }, NOW)
    expect(await judgedIds()).toStrictEqual([1])
    expect((await judgePending({ db: env.DB, apiKey: 'k' }, NOW)).judged).toStrictEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('1 回の上限を超えた分は残り、次の周期で判定される', async () => {
    const extra = Array.from({ length: JUDGE_LIMIT_PER_CRAWL + 5 }, (_, i) =>
      env.DB.prepare(
        'INSERT INTO articles (feed_id, guid, url, title, fetched_at) VALUES (1, ?, ?, ?, 200)',
      ).bind(`x${i}`, `https://a.test/x${i}`, `X${i}`),
    )
    await env.DB.batch(extra)
    const fetchMock = mockFetch(() => jevOk())

    await judgePending({ db: env.DB, apiKey: 'k' }, NOW)
    expect(fetchMock).toHaveBeenCalledTimes(JUDGE_LIMIT_PER_CRAWL)
    // 取り込んだ順（id 1, 3, 4, ...）に選ぶ。流入が上限を超え続けても、古い記事が取り残されない。
    const oldest = Array.from({ length: JUDGE_LIMIT_PER_CRAWL - 1 }, (_, i) => i + 3)
    expect(await judgedIds()).toStrictEqual([1, ...oldest])
    await judgePending({ db: env.DB, apiKey: 'k' }, NOW)
    // 2 周期で全 26 件（既存の A を含む）が判定済みになる。
    expect(await judgedIds()).toHaveLength(JUDGE_LIMIT_PER_CRAWL + 5 + 1)
  })

  it('判定が失敗しても取り込みは止まらず、記事は未判定のまま間隔を空けて再試行される', async () => {
    mockFetch(() => new Response('boom', { status: 500 }))
    const { failed } = await crawlAll(env.DB, NOW, 'k')
    expect(failed).toStrictEqual([])
    const row = await env.DB.prepare("SELECT 1 AS n FROM articles WHERE guid = 'gnew'").first()
    expect(row).not.toBeNull()
    expect(await judgedIds()).toStrictEqual([])

    // 失敗から 1 時間経つまでは選ばれない。
    mockFetch(() => jevOk())
    await crawlAll(env.DB, NOW + HOUR - 1, 'k')
    expect(await judgedIds()).toStrictEqual([])
    await crawlAll(env.DB, NOW + HOUR, 'k')
    expect(await judgedIds()).toContain(1)
  })

  it('毎回失敗する記事があっても他の記事は判定され、失敗した記事への呼び出しは間隔が延びていく', async () => {
    let badCalls = 0
    const fetchMock = mockFetch((body) => {
      if (!body.includes('"BAD"')) return jevOk()
      badCalls += 1
      return new Response('bad request', { status: 400 })
    })
    await env.DB.prepare(
      "INSERT INTO articles (id, feed_id, guid, url, title, fetched_at) VALUES (3, 1, 'g3', 'https://a.test/3', 'BAD', 100)",
    ).run()
    const addArticle = (id: number) =>
      env.DB.prepare(
        "INSERT INTO articles (id, feed_id, guid, url, title, fetched_at) VALUES (?, 1, ?, ?, 'OK', 100)",
      )
        .bind(id, `g${id}`, `https://a.test/${id}`)
        .run()
    const run = async (at: number) => (await judgePending({ db: env.DB, apiKey: 'k' }, at)).failed

    expect(await run(NOW)).toStrictEqual([3])
    expect(await judgedIds()).toStrictEqual([1])

    // 1 回失敗: 1 時間は選ばれず、その間に入った記事は判定される。
    await addArticle(4)
    expect(await run(NOW + HOUR - 1)).toStrictEqual([])
    expect(await judgedIds()).toStrictEqual([1, 4])
    expect(await run(NOW + HOUR)).toStrictEqual([3])

    // 2 回失敗: 次は 2 時間空く。
    expect(await run(NOW + HOUR * 3 - 1)).toStrictEqual([])
    expect(await run(NOW + HOUR * 3)).toStrictEqual([3])
    expect(badCalls).toBe(3)

    // 間隔は 64 時間で頭打ちになり、記事は選択に戻り続ける。
    await env.DB.prepare(
      'UPDATE articles SET judge_failures = 20, judge_failed_at = ? WHERE id = 3',
    )
      .bind(NOW)
      .run()
    expect(await run(NOW + HOUR * 64 - 1)).toStrictEqual([])
    expect(await run(NOW + HOUR * 64)).toStrictEqual([3])
    expect(fetchMock).toHaveBeenCalledTimes(badCalls + 2)
  })

  it('画面から「記事ごとに判定」を設定・解除できる', async () => {
    const headers = await (await installAccessKeys()).headers()
    const put = (body: Record<string, string>) =>
      exports.default.fetch('https://rssagg.example/settings/feeds/2/judge-each', {
        method: 'PUT',
        headers,
        body: new URLSearchParams(body),
      })
    const flag = async () =>
      (
        await env.DB.prepare('SELECT judge_each AS v FROM feeds WHERE id = 2').first<{
          v: number
        }>()
      )?.v
    try {
      expect((await put({ judge_each: 'on' })).status).toBe(200)
      expect(await flag()).toBe(1)
      await put({})
      expect(await flag()).toBe(0)
    } finally {
      removeAccessKeys()
    }
  })
})
