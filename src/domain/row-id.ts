import { z } from 'zod'

/**
 * パスで受け取る行 id（フィード・記事）。正の整数の 10 進表記だけを数値にする。
 *
 * Number() に任せると 1e3 や 0x10 まで整数として通り、別の行を消しかねない。
 */
export const rowIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,14}$/u)
  .transform(Number)
