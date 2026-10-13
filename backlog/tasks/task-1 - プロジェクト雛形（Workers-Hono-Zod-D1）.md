---
id: TASK-1
title: プロジェクト雛形（Workers + Hono + Zod + D1）
status: To Do
assignee: []
created_date: '2026-10-13 13:10'
updated_date: '2026-10-13 13:16'
labels: []
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
wrangler.jsonc、Hono エントリ、D1 バインディング、型チェックと dev 起動まで。ADR-0003/0004 準拠。ADR-0005 に従い workers_dev:false・preview_urls:false を設定し、Cf-Access-Jwt-Assertion の検証ミドルウェアを入れる（wrangler dev では迂回可）。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 wrangler dev でヘルスチェックが返る
- [ ] #2 tsc が通る
- [ ] #3 workers_dev と preview_urls が無効
- [ ] #4 Access JWT の署名と aud を検証し、無い・不正なら 401
<!-- AC:END -->
