import { env } from 'cloudflare:workers'
import { afterEach, describe, expect, it } from 'vitest'

const NOW = 1_700_000_000

async function insertFeed(): Promise<number> {
  const feed = await env.DB.prepare(
    'INSERT INTO feeds (url, created_at) VALUES (?, ?) RETURNING id',
  )
    .bind('https://example.com/feed.xml', NOW)
    .first<{ id: number }>()
  if (feed === null) throw new Error('feeds への挿入が行を返さなかった')
  return feed.id
}

async function insertArticle(feedId: number, guid = 'a-1'): Promise<number> {
  const article = await env.DB.prepare(
    'INSERT INTO articles (feed_id, guid, url, title, fetched_at) VALUES (?, ?, ?, ?, ?) RETURNING id',
  )
    .bind(feedId, guid, `https://example.com/${guid}`, 'title', NOW)
    .first<{ id: number }>()
  if (article === null) throw new Error('articles への挿入が行を返さなかった')
  return article.id
}

async function count(table: string): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>()
  return row?.n ?? -1
}

describe('D1 スキーマ', () => {
  // テスト間で D1 の内容が引き継がれるため、親の feeds を消して子を連鎖削除で空に戻す。
  afterEach(async () => {
    await env.DB.prepare('DELETE FROM feeds').run()
  })

  it('マイグレーションで 4 つのテーブルができる', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('feeds', 'articles', 'judgments', 'saved') ORDER BY name",
    ).all<{ name: string }>()
    expect(results.map((r) => r.name)).toStrictEqual(['articles', 'feeds', 'judgments', 'saved'])
  })

  it('同じフィードの同じ guid は二重に登録できない', async () => {
    const feedId = await insertFeed()
    await insertArticle(feedId)
    await expect(insertArticle(feedId)).rejects.toThrow(/UNIQUE constraint failed/u)
  })

  it('判定の確率が 0〜1 の範囲外なら拒否する', async () => {
    const articleId = await insertArticle(await insertFeed())
    const insert = env.DB.prepare(
      'INSERT INTO judgments (article_id, topic, score, judged_at) VALUES (?, ?, ?, ?)',
    )
    await expect(insert.bind(articleId, 'tech', 1.5, NOW).run()).rejects.toThrow(
      /CHECK constraint failed/u,
    )
  })

  it('フィードを消すと、記事・判定・保存が連鎖して消える', async () => {
    const feedId = await insertFeed()
    const articleId = await insertArticle(feedId)
    await env.DB.prepare(
      'INSERT INTO judgments (article_id, topic, score, judged_at) VALUES (?, ?, ?, ?)',
    )
      .bind(articleId, 'tech', 0.9, NOW)
      .run()
    await env.DB.prepare('INSERT INTO saved (article_id, saved_at) VALUES (?, ?)')
      .bind(articleId, NOW)
      .run()

    await env.DB.prepare('DELETE FROM feeds WHERE id = ?').bind(feedId).run()

    expect([await count('articles'), await count('judgments'), await count('saved')]).toStrictEqual(
      [0, 0, 0],
    )
  })
})
