import { type Context, Hono } from 'hono'

import {
  getArticle,
  getJudgeTarget,
  listSavedArticles,
  saveArticle,
  unsaveArticle,
} from '../db/articles'
import { listGenres } from '../db/feeds'
import { rowIdSchema } from '../domain/row-id'
import type { AppEnv } from '../env'
import { judgeArticles } from '../jobs/judge'
import { ArticleRow, SavedPage } from '../views/articles'
import { page } from '../views/layout'

/**
 * 書き込んだあと、更新後の行の断片を返して htmx が行を差し替える。
 *
 * 記事が別のタブで消えていても、行を消せば目的は同じなので、無ければ空の 200 にする
 * （feeds の削除と同じ扱い）。id が壊れているのは画面からは起きないので、理由は出さない。
 */
async function respondWithRow(
  c: Context<AppEnv>,
  write: (id: number) => Promise<void>,
): Promise<Response> {
  const id = rowIdSchema.safeParse(c.req.param('id'))
  if (!id.success) return c.text('invalid_id', 400)

  await write(id.data)
  const article = await getArticle(c.env.DB, id.data)
  return article === undefined ? c.body(null, 200) : c.html(<ArticleRow article={article} />)
}

/** 「後で読む」。 */
export const articlesRoute = new Hono<AppEnv>()
  .get('/saved', async (c) =>
    c.html(page('後で読む', <SavedPage articles={await listSavedArticles(c.env.DB)} />)),
  )
  .put('/:id/saved', (c) =>
    respondWithRow(c, (id) => saveArticle(c.env.DB, id, Math.floor(Date.now() / 1000))),
  )
  // 手動で指定した記事だけを Jev で判定する（ADR-0011）。判定済みなら judgeArticles が呼ばずに飛ばす。
  .post('/:id/judgment', async (c) => {
    const id = rowIdSchema.safeParse(c.req.param('id'))
    if (!id.success) return c.text('invalid_id', 400)

    const target = await getJudgeTarget(c.env.DB, id.data)
    if (target === undefined) return c.body(null, 200)
    const genres = await listGenres(c.env.DB)
    // ジャンルが無いと問う選択肢が無い。失敗ではなく設定の不足なので、別の案内を出す。
    const r =
      genres.length === 0
        ? undefined
        : await judgeArticles(
            { db: c.env.DB, apiKey: c.env.JEV_API_KEY },
            { articles: [target], genres, now: Math.floor(Date.now() / 1000) },
          )
    const article = await getArticle(c.env.DB, id.data)
    return article === undefined
      ? c.body(null, 200)
      : c.html(
          <ArticleRow
            article={article}
            judge={
              r === undefined
                ? 'no_genres'
                : r.skipped || r.failed.length > 0
                  ? 'failed'
                  : undefined
            }
          />,
        )
  })
  .delete('/:id/saved', (c) => respondWithRow(c, (id) => unsaveArticle(c.env.DB, id)))
