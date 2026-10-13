---
id: TASK-8
title: behold から CI・スクリプト・hooks を移植
status: To Do
assignee: []
created_date: '2026-10-13 13:25'
labels:
  - porting
dependencies:
  - TASK-1
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
behold/site から移植する残り。(1) .github/workflows: site.yml の lint→format:check→typecheck→test→deploy の順序、破壊的マイグレーションのガード（scripts/check-destructive-migrations.sh と lib/d1-pending-migrations.sh。D1 名は置換）、手動 migrate ワークフロー。(2) .claude/settings.json の hooks: 適用済み migrations/*.sql の編集ブロック、wrangler d1 execute のブロック、git stash のブロック、TS 編集時の oxlint/oxfmt・vitest 実行、SessionStart の npm ci。ユーザー承認の上で設定する。(3) vitest.config.ts と test/setup.ts と test/access-helpers.ts（Access JWT 検証のテスト基盤。ADR-0005）。(4) wrangler.toml の雛形（ID・ドメインは新規に払い出す）。TASK-1 の雛形完成後に着手。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CI が lint・format・typecheck・test を通す
- [ ] #2 破壊的マイグレーションのガードが動く
- [ ] #3 Access JWT 検証のテスト基盤がある
<!-- AC:END -->
