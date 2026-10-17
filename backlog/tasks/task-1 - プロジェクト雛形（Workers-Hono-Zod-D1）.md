---
id: TASK-1
title: プロジェクト雛形（Workers + Hono + Zod + D1）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-13 13:10'
updated_date: '2026-10-17 08:56'
labels: []
dependencies:
  - TASK-8
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
wrangler.jsonc（ID・ドメインは新規に払い出す）、Hono エントリ、D1 バインディング、型チェックと dev 起動まで。ADR-0003/0004 準拠。ADR-0005 に従い workers_dev:false・preview_urls:false を設定し、Cf-Access-Jwt-Assertion の検証ミドルウェアを入れる（wrangler dev では迂回可）。CI・hooks・vitest 基盤は TASK-8 で先に用意する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 wrangler dev でヘルスチェックが返る
- [x] #2 tsc が通る
- [x] #3 workers_dev と preview_urls が無効
- [x] #4 Access JWT の署名と aud を検証し、無い・不正なら 401
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. wrangler.jsonc（name=rsstools, main=src/index.ts, workers_dev:false, preview_urls:false, D1 DB バインディング, vars の ACCESS_TEAM_DOMAIN/ACCESS_AUD）。D1 の database_id と本番ドメインは Cloudflare 側で払い出す外部操作のため、ローカル用の仮値を置いてユーザーに確認する
2. src/index.ts（Hono + /healthz）、src/env.ts、src/middleware/access.ts（Access JWT 検証。behold の access.ts を移植）
3. spec と test/ に JWT 検証テスト（無い・不正は 401）
4. pnpm cf-typegen、lint/format/typecheck/test、wrangler dev で /healthz を実測
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
検証: lint/lint:md/format:check/typecheck/test すべて終了コード 0（テスト 4 件通過）。wrangler dev --port 8799 で ACCESS_BYPASS=true の .dev.vars 時に /healthz が {"ok":true} 200、無しは 401（エージェント実測＋自分で再実測）。迂回は ACCESS_BYPASS=true かつ宛先ホストが localhost 系のときのみ。compatibility_date は同梱 workerd の上限 2026-08-22。worker-configuration.d.ts はコミット対象（vars 変更時は pnpm cf-typegen で再生成）。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
wrangler.jsonc（workers_dev:false・preview_urls:false・D1 DB バインディング）、Hono エントリと /healthz、Access JWT 検証ミドルウェア（Web Crypto の RS256、署名・aud・iss・exp・nbf、無い・不正は 401）、JWT 検証の結合テストを追加した。未決（ユーザーの Cloudflare 側作業）: 本物の D1 database_id（現状は全ゼロの仮値）、ACCESS_TEAM_DOMAIN / ACCESS_AUD、本番ドメイン（routes）。いずれも wrangler.jsonc にコメントで仮値と明記。フォローアップ: @cloudflare/vitest-pool-workers の改名警告（vitest-plugin）への対応は別判断。
<!-- SECTION:FINAL_SUMMARY:END -->
