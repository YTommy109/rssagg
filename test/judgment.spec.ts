import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installAccessKeys, removeAccessKeys } from './access-helpers'

const BASE = 'https://rssagg.example'

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

/** Jev への呼び出しだけ差し替える。Access の鍵配布など他の fetch は、差し替え前のものへ流す。 */
function mockJev(respond: () => Response) {
  const prev = globalThis.fetch
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    return url.includes('api.typesafe.ai') ? Promise.resolve(respond()) : prev(input, init)
  })
}

describe('記事の手動判定', () => {
  let headers: Record<string, string>
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    headers = await (await installAccessKeys()).headers()
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO feeds (id, url, genre, created_at) VALUES (1, 'https://a.test/f', 'sports', 0), (2, 'https://b.test/f', 'tech', 0)",
      ),
      env.DB.prepare(
        `INSERT INTO articles (id, feed_id, guid, url, title, published_at, fetched_at) VALUES
         (1, 1, 'g1', 'https://a.test/1', '記事one', 100, 100)`,
      ),
    ])
  })
  afterEach(async () => {
    removeAccessKeys()
    vi.restoreAllMocks()
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  const judge = () =>
    exports.default.fetch(`${BASE}/articles/1/judgment`, { method: 'POST', headers })

  it('判定するとジャンルと確率が出て、二重に依頼しても Jev は 1 回しか呼ばない', async () => {
    const respond = vi.fn<() => Response>(jevOk)
    mockJev(respond)
    const html = await (await judge()).text()
    expect(html).toContain('ジャンル: tech（80%）')
    expect(html).not.toContain('hx-post')

    await judge()
    expect(respond).toHaveBeenCalledTimes(1)
  })

  it('記事単位の判定が、サイト単位のジャンル（sports）より絞り込みで優先される', async () => {
    mockJev(jevOk)
    await judge()
    const home = (q: string) =>
      exports.default.fetch(`${BASE}/?${q}`, { headers }).then((r) => r.text())
    expect(await home('exclude=sports')).toContain('記事one')
    expect(await home('exclude=tech')).not.toContain('記事one')
  })

  it('Jev が失敗したら失敗を示し、記事は残って再依頼できる', async () => {
    mockJev(() => new Response('boom', { status: 500 }))
    const html = await (await judge()).text()
    expect(html).toContain('判定に失敗しました')
    expect(html).toContain('記事one')
    expect(html).toContain('hx-post="/articles/1/judgment"')
  })

  it('ジャンルが 1 つも無ければ、失敗ではなく設定の案内を出し、Jev は呼ばない', async () => {
    await env.DB.prepare('UPDATE feeds SET genre = NULL').run()
    const respond = vi.fn<() => Response>(jevOk)
    mockJev(respond)
    const html = await (await judge()).text()
    expect(html).toContain('ジャンルが未設定です')
    expect(html).not.toContain('判定に失敗しました')
    expect(respond).not.toHaveBeenCalled()
  })
})
