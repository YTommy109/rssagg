import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { crawlAll } from '../src/jobs/crawl'
import { JUDGE_LIMIT_PER_CRAWL, judgePending } from '../src/jobs/judge'
import { installAccessKeys, removeAccessKeys } from './access-helpers'

const NOW = 1_800_000_000

const jevOk = () =>
  new Response(
    JSON.stringify({
      model: 'jev-1',
      answers: {
        genre: {
          type: 'choice',
          choice: 'tech',
          probabilities: { tech: 0.8, sports: 0.1, 該当なし: 0.1 },
          confidence: 0.9,
        },
      },
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  )

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>
<item><title>新着</title><link>https://a.test/new</link><guid>gnew</guid></item></channel></rss>`

/** Jev の呼び出し先とそれ以外（フィード取得）を振り分ける。 */
function mockFetch(jev: () => Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = new Request(input).url
    return Promise.resolve(url.includes('api.typesafe.ai') ? jev() : new Response(RSS))
  })
}

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
    const fetchMock = mockFetch(jevOk)
    await judgePending({ db: env.DB, apiKey: 'k' }, NOW)
    expect(await judgedIds()).toStrictEqual([1])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('1 回の上限を超えた分は残り、次の周期で判定される', async () => {
    const extra = Array.from({ length: JUDGE_LIMIT_PER_CRAWL + 5 }, (_, i) =>
      env.DB.prepare(
        'INSERT INTO articles (feed_id, guid, url, title, fetched_at) VALUES (1, ?, ?, ?, 200)',
      ).bind(`x${i}`, `https://a.test/x${i}`, `X${i}`),
    )
    await env.DB.batch(extra)
    const fetchMock = mockFetch(jevOk)

    await judgePending({ db: env.DB, apiKey: 'k' }, NOW)
    expect(fetchMock).toHaveBeenCalledTimes(JUDGE_LIMIT_PER_CRAWL)
    await judgePending({ db: env.DB, apiKey: 'k' }, NOW)
    // 2 周期で全 26 件（既存の A を含む）が判定済みになる。
    expect(await judgedIds()).toHaveLength(JUDGE_LIMIT_PER_CRAWL + 5 + 1)
  })

  it('判定が失敗しても取り込みは止まらず、記事は未判定のまま次の周期で再試行できる', async () => {
    mockFetch(() => new Response('boom', { status: 500 }))
    const { failed } = await crawlAll(env.DB, NOW, 'k')
    expect(failed).toStrictEqual([])
    const row = await env.DB.prepare("SELECT 1 AS n FROM articles WHERE guid = 'gnew'").first()
    expect(row).not.toBeNull()
    expect(await judgedIds()).toStrictEqual([])

    mockFetch(jevOk)
    await crawlAll(env.DB, NOW, 'k')
    expect(await judgedIds()).toContain(1)
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
