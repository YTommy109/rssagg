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
 * パスで受け取るフィード id。正の整数の 10 進表記だけを数値にする。
 *
 * Number() に任せると 1e3 や 0x10 まで整数として通り、別のフィードを消しかねない。
 */
export const feedIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,14}$/u)
  .transform(Number)
