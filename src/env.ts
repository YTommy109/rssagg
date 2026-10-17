/**
 * Hono に渡す型。`Env` は `pnpm cf-typegen` が wrangler.jsonc から生成する。
 *
 * `ACCESS_BYPASS` は本番の vars に置かない（.dev.vars のみ）ため、typegen の
 * 対象外になる。ここで任意項目として足す。
 */
export type AppEnv = {
  Bindings: Env & { ACCESS_BYPASS?: string }
}
