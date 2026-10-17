---
id: TASK-8
title: behold から CI・スクリプト・hooks を移植
status: In Progress
assignee:
  - '@claude'
created_date: '2026-10-13 13:25'
updated_date: '2026-10-17 11:16'
labels:
  - porting
dependencies: []
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
behold/site から移植する、アプリ本体に依存しない環境構築の残り。TASK-1 の雛形より先に着手する（TASK-1 の受け入れ条件 #4 のテストに (3) の基盤が要るため）。(1) .github/workflows: site.yml の lint→format:check→typecheck→test→deploy の順序、破壊的マイグレーションのガード（scripts/check-destructive-migrations.sh と lib/d1-pending-migrations.sh。D1 名は置換）、手動 migrate ワークフロー。(2) .claude/settings.json の hooks: 適用済み migrations/*.sql の編集ブロック、wrangler d1 execute のブロック、git stash のブロック、TS 編集時の oxlint/oxfmt・vitest 実行、SessionStart の pnpm install。ユーザー承認の上で設定する。(3) vitest.config.ts と test/setup.ts と test/access-helpers.ts（Access JWT 検証のテスト基盤。ADR-0005）。wrangler の雛形は TASK-1 で作る。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CI が lint・format・typecheck・test を通す
- [x] #2 破壊的マイグレーションのガードが動く
- [x] #3 Access JWT 検証のテスト基盤がある
- [x] #4 behold の .markdownlint-cli2.jsonc を複製し、globs と ignores をこのリポジトリ用に調整している（TASK-219 などの behold 固有の参照は除く。backlog/** は除外し、無効化する MD013・MD060・MD041 は理由を残す）
- [x] #5 markdownlint-cli2 が pnpm script・CI・Claude の hooks（md 編集時）から実行され、既存の Markdown が違反ゼロで通る
- [x] #6 vitest.config.ts の include が src/**/*.spec.ts と test/**/*.spec.ts を拾い、本体の隣の単体テストと test/ の結合テストの両方が実行される（ADR-0008）
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. [A] .github/workflows/ci.yml・migrate.yml と scripts/check-destructive-migrations.sh・scripts/lib/d1-pending-migrations.sh を behold から移植（Swift 系・TASK 参照・staging は除く、D1 名は rsstools、npm→pnpm）。package.json に migrate:remote / migrate:list を追加
2. [B] vitest.config.ts（include=src/**/*.spec.ts と test/**/*.spec.ts）・test/setup.ts・test/access-helpers.ts を移植。.markdownlint-cli2.jsonc を調整して複製し、pnpm run lint:md を追加、既存 Markdown の違反をゼロにする
3. CI に markdownlint を組み込む
4. hooks（.claude/settings.json）は承認が必要なため、案を提示してユーザー承認後に設定
5. 受け入れ条件を実コマンドで検証してから完了処理
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
テストの拡張子は *.spec.ts、関数は it に統一する（ADR-0008）。.oxlintrc.json のテスト用 override と vitest/consistent-test-it は設定済み。vitest.config.ts の include だけが残っている。

TASK-1 完了に伴い lint/format/typecheck/test がローカルで通る状態になった（AC#1 は GitHub Actions 上の実行が未確認）。(1) ci.yml・migrate.yml・破壊的マイグレーションのガード、(3) vitest 基盤、markdownlint（違反ゼロ、lint:md を CI と check に追加）は実装済み。残り: .claude/settings.json の hooks（ユーザー承認待ち）、AC#5 の Claude hooks（md 編集時）。

hooks（.claude/settings.json）をユーザー承認のうえ設定。PreToolUse（d1 execute は --local 無しでブロック、git stash、既存 migrations/*.sql の編集、backlog/**/*.md の直接編集）、PostToolUse（vitest、oxlint+oxfmt、actionlint、markdownlint-cli2）、SessionStart（pnpm install）。擬似入力 15 件で許可/拒否を確認し、実機では PreToolUse（backlog への Write）と PostToolUse（違反 md で MD012・exit 2）が効くことを確認。AC#2: 偽の pnpm と偽 migrations で DROP/RENAME/DELETE FROM/TRUNCATE を検出（exit 1）、コメント行のみは通過。AC#6: 一時的な src/probe.spec.ts と test/access.spec.ts が両方実行（2 ファイル 5 件通過、一時 spec は削除）。AC#1 は GitHub Actions 上の実行が未確認のため未チェック。注意: main への push は deploy ジョブを起動するため、database_id が仮値のうちはブランチ/PR で CI を回すこと。
<!-- SECTION:NOTES:END -->
