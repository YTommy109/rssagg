import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { installAccessKeys, removeAccessKeys } from './access-helpers'

const BASE = 'https://rssagg.example'

describe('ジャンルによる選別', () => {
  let headers: Record<string, string>

  beforeEach(async () => {
    const keys = await installAccessKeys()
    headers = await keys.headers()
    const feeds: [number, string | null][] = [
      [1, 'tech'],
      [2, 'sports'],
      [3, null],
    ]
    for (const [id, genre] of feeds) {
      await env.DB.prepare('INSERT INTO feeds (id, url, genre, created_at) VALUES (?, ?, ?, 0)')
        .bind(id, `https://example.com/${id}.xml`, genre)
        .run()
      await env.DB.prepare(
        'INSERT INTO articles (feed_id, guid, url, title, fetched_at) VALUES (?, ?, ?, ?, 0)',
      )
        .bind(id, `g${id}`, `https://example.com/a${id}`, `記事${id}`)
        .run()
    }
  })
  afterEach(async () => {
    removeAccessKeys()
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  async function titles(query: string): Promise<string[]> {
    const body = await (await exports.default.fetch(`${BASE}/${query}`, { headers })).text()
    return [1, 2, 3].filter((i) => body.includes(`>記事${i}<`)).map((i) => `記事${i}`)
  }

  it('絞り込み無しなら全部出る', async () => {
    expect(await titles('')).toStrictEqual(['記事1', '記事2', '記事3'])
  })

  it('include は指定ジャンルと未設定だけを残す', async () => {
    expect(await titles('?include=tech')).toStrictEqual(['記事1', '記事3'])
  })

  it('exclude は指定ジャンルを除き、未設定は隠さない', async () => {
    expect(await titles('?exclude=tech')).toStrictEqual(['記事2', '記事3'])
  })

  it('同じジャンルが両方にあれば exclude が勝つ', async () => {
    expect(await titles('?include=tech&include=sports&exclude=tech')).toStrictEqual([
      '記事2',
      '記事3',
    ])
  })

  it('実在しないジャンルの指定は無視し、何も隠さない', async () => {
    expect(await titles('?include=&include=gone&exclude=gone')).toStrictEqual([
      '記事1',
      '記事2',
      '記事3',
    ])
  })

  it('画面からジャンルを設定・変更・解除できる', async () => {
    const put = (id: number, genre: string) =>
      exports.default.fetch(`${BASE}/settings/feeds/${id}/genre`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ genre }),
      })
    const genre = async () =>
      (
        await env.DB.prepare('SELECT genre FROM feeds WHERE id = 3').first<{
          genre: string | null
        }>()
      )?.genre

    // 成功したら、候補（datalist）を今の一覧に入れ替える断片を返す。
    const saved = await put(3, '  news ')
    expect(saved.status).toBe(200)
    expect(await saved.text()).toContain('<datalist id="genres" hx-swap-oob="true">')
    expect(await genre()).toBe('news')
    expect(await titles('?exclude=news')).toStrictEqual(['記事1', '記事2'])

    expect((await put(3, 'web 　 dev')).status).toBe(200)
    expect(await genre()).toBe('web dev')

    expect((await put(3, '')).status).toBe(200)
    expect(await genre()).toBeNull()

    // 失敗の理由は #form-error に出す（入力欄は hx-swap="none" なので、向き先を変えないと見えない）。
    const tooLong = await put(3, 'x'.repeat(51))
    expect(tooLong.status).toBe(422)
    expect(tooLong.headers.get('HX-Retarget')).toBe('#form-error')
    const gone = await put(99, 'a')
    expect(gone.status).toBe(404)
    expect(gone.headers.get('HX-Retarget')).toBe('#form-error')
  })
})
