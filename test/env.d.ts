// vitest.config.ts がバインディングとして渡すテスト専用の値。wrangler.jsonc には無いため、
// typegen の Env には入らない。
declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
