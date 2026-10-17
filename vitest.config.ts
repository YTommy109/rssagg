import { existsSync } from 'node:fs'
import path from 'node:path'

import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const WRANGLER_CONFIG = path.join(import.meta.dirname, 'wrangler.jsonc')
const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations')

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      // Atlas が生成したマイグレーションをテスト用 D1 に流し込むため、内容を読み込んで
      // バインディング経由でテスト側へ渡す（適用は test/setup.ts で行う）。
      const migrations = existsSync(MIGRATIONS_DIR) ? await readD1Migrations(MIGRATIONS_DIR) : []

      return {
        singleWorker: true,
        // wrangler.jsonc は TASK-1 で作る。無い間は設定なしで起動し、pnpm test が設定読み込みで落ちないようにする。
        ...(existsSync(WRANGLER_CONFIG) ? { wrangler: { configPath: './wrangler.jsonc' } } : {}),
        miniflare: {
          // .dev.vars は gitignore 対象なので、テスト用の認証情報はここで固定する。
          bindings: {
            TEST_MIGRATIONS: migrations,
            ACCESS_TEAM_DOMAIN: 'test-team.cloudflareaccess.com',
            ACCESS_AUD: 'test-aud',
          },
        },
      }
    }),
  ],
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    setupFiles: ['./test/setup.ts'],
  },
})
