---
id: TASK-8
title: behold から CI・スクリプト・hooks を移植
status: To Do
assignee: []
created_date: '2026-10-13 13:25'
updated_date: '2026-10-17 08:41'
labels:
  - porting
dependencies: []
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
behold/site から移植する、アプリ本体に依存しない環境構築の残り。TASK-1 の雛形より先に着手する（TASK-1 の受け入れ条件 #4 のテストに (3) の基盤が要るため）。(1) .github/workflows: site.yml の lint→format:check→typecheck→test→deploy の順序、破壊的マイグレーションのガード（scripts/check-destructive-migrations.sh と lib/d1-pending-migrations.sh。D1 名は置換）、手動 migrate ワークフロー。(2) .claude/settings.json の hooks: 適用済み migrations/*.sql の編集ブロック、wrangler d1 execute のブロック、git stash のブロック、TS 編集時の oxlint/oxfmt・vitest 実行、SessionStart の npm ci。ユーザー承認の上で設定する。(3) vitest.config.ts と test/setup.ts と test/access-helpers.ts（Access JWT 検証のテスト基盤。ADR-0005）。wrangler の雛形は TASK-1 で作る。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CI が lint・format・typecheck・test を通す
- [ ] #2 破壊的マイグレーションのガードが動く
- [ ] #3 Access JWT 検証のテスト基盤がある
- [ ] #4 behold の .markdownlint-cli2.jsonc を複製し、globs と ignores をこのリポジトリ用に調整している（TASK-219 などの behold 固有の参照は除く。backlog/** は除外し、無効化する MD013・MD060・MD041 は理由を残す）
- [ ] #5 markdownlint-cli2 が npm script・CI・Claude の hooks（md 編集時）から実行され、既存の Markdown が違反ゼロで通る
- [ ] #6 vitest.config.ts の include が src/**/*.spec.ts と test/**/*.spec.ts を拾い、本体の隣の単体テストと test/ の結合テストの両方が実行される（ADR-0008）
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
テストの拡張子は *.spec.ts、関数は it に統一する（ADR-0008）。.oxlintrc.json のテスト用 override と vitest/consistent-test-it は設定済み。vitest.config.ts の include だけが残っている。
<!-- SECTION:NOTES:END -->
