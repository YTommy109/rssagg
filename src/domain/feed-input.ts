import { z } from 'zod'

/**
 * 登録するフィードの URL。検証して正規化した文字列にする。
 *
 * http/https 以外（file: や javascript: など）はクロールできず、受け付ける理由も無い。
 * 認証情報つきの URL は DB と一覧にそのまま残ってしまうため受け付けない。
 * 保存前に URL を正規化する（ホスト名の大文字小文字・既定ポート・フラグメント）のは、
 * 表記違いの同じフィードを別物として登録させないため。パスは意味が変わり得るので触らない。
 */
export const feedUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .pipe(z.url({ protocol: /^https?$/u }))
  .transform((raw) => new URL(raw))
  .refine((url) => url.username === '' && url.password === '')
  .transform((url) => {
    url.hash = ''
    return url.href
  })

/**
 * ジャンル。前後の空白を除き、空文字は未設定（null）として扱う。
 *
 * 内側の連続する空白（全角を含む）も 1 つに潰す。見た目が同じ「web dev」と「web  dev」が
 * 別のジャンルになると、候補にも絞り込みにも同じ名前が 2 つ並ぶ。
 */
export const genreSchema = z
  .string()
  .trim()
  .max(50)
  .transform((g) => g.replaceAll(/\s+/gu, ' '))
  .transform((g) => (g === '' ? null : g))
