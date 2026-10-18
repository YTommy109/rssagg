/**
 * Hono に渡す型。`Env` は `pnpm cf-typegen` が wrangler.jsonc から生成する。
 *
 * `ACCESS_BYPASS` と `JEV_API_KEY` は typegen の対象外になるため、ここで足す。
 * - `ACCESS_BYPASS` は本番の vars に置かない（.dev.vars のみ）。
 * - `JEV_API_KEY` は Workers Secrets に置く（ADR-0009）。wrangler.jsonc の `secrets.required`
 *   に宣言すると、`wrangler dev` が .dev.vars から宣言済みのキーしか読まなくなり
 *   `ACCESS_BYPASS` が消えるため、宣言せずにここで型を持つ。
 */
export type AppEnv = {
  Bindings: Env & { ACCESS_BYPASS?: string; JEV_API_KEY: string }
}
