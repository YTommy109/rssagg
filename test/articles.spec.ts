import { env, exports } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ARTICLE_LIST_LIMIT } from '../src/db/articles'
import { installAccessKeys, removeAccessKeys } from './access-helpers'

describe('記事一覧 /', () => {
  let headers: Record<string, string>
  beforeEach(async () => {
    headers = await (await installAccessKeys()).headers()
    await env.DB.prepare(
      "INSERT INTO feeds (id, url, title, created_at) VALUES (1, 'https://a.test/f', 'Blog A', 0), (2, 'https://b.test/f', NULL, 0)",
    ).run()
  })
  afterEach(async () => {
    removeAccessKeys()
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  const get = async () =>
    (await exports.default.fetch('https://rssagg.example/', { headers })).text()
  const insert = (a: {
    feed: number
    guid: string
    url: string
    title: string
    pub: number | null
    fetched: number
  }) =>
    env.DB.prepare(
      'INSERT INTO articles (feed_id, guid, url, title, published_at, fetched_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(a.feed, a.guid, a.url, a.title, a.pub, a.fetched)
      .run()

  it('記事が無ければ空であることを示す', async () => {
    expect(await get()).toContain('記事はまだありません')
  })

  it('公開日時（無ければ取得日時）の新しい順に、タイトルのリンク・フィード名（無ければ URL）を出す', async () => {
    await insert({
      feed: 1,
      guid: 'old',
      url: 'https://a.test/old',
      title: 'Old',
      pub: 1000,
      fetched: 9000,
    })
    await insert({
      feed: 2,
      guid: 'new',
      url: 'https://b.test/new',
      title: 'New',
      pub: null,
      fetched: 5000,
    })
    const body = await get()
    expect(body.indexOf('New')).toBeLessThan(body.indexOf('Old'))
    expect(body).toContain('<a href="https://b.test/new"')
    expect(body).toContain('Blog A')
    expect(body).toContain('https://b.test/f')
  })

  it('http(s) 以外の URL はリンクにしない', async () => {
    await insert({
      feed: 1,
      guid: 'x',
      url: 'javascript:alert(1)',
      title: 'Evil',
      pub: 1,
      fetched: 1,
    })
    const body = await get()
    expect(body).toContain('Evil')
    expect(body).not.toContain('javascript:')
  })

  it('上限を超える件数は表示しない', async () => {
    const n = ARTICLE_LIST_LIMIT + 5
    await env.DB.batch(
      Array.from({ length: n }, (_, i) =>
        env.DB.prepare(
          "INSERT INTO articles (feed_id, guid, url, title, published_at, fetched_at) VALUES (1, ?, 'https://a.test/x', ?, ?, 0)",
        ).bind(`g${i}`, `T${i}-end`, i),
      ),
    )
    expect((await get()).match(/-end</gu)).toHaveLength(ARTICLE_LIST_LIMIT)
  })
})
