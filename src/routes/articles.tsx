import { type Context, Hono } from 'hono'

import { getArticle, listSavedArticles, saveArticle, unsaveArticle } from '../db/articles'
import { rowIdSchema } from '../domain/row-id'
import type { AppEnv } from '../env'
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
  .delete('/:id/saved', (c) => respondWithRow(c, (id) => unsaveArticle(c.env.DB, id)))
