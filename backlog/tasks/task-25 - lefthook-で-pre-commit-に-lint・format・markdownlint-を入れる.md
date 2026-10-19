---
id: TASK-25
title: lefthook で pre-commit に lint・format・markdownlint を入れる
status: Done
assignee:
  - '@claude'
created_date: '2026-10-19 04:14'
updated_date: '2026-10-19 06:26'
labels: []
dependencies: []
priority: medium
type: chore
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Claude のフック（Edit/Write 後）と CI でしか lint が走らないため、Bash の heredoc や自分のエディタで書いたファイルは CI まで検査されない。実際に、heredoc で書いた docs の裸のメールアドレスが CI の lint:md で落ちた（PR #13）。コミット時に、ステージ済みファイルへ軽い検査をかける。選定は lefthook（単一バイナリで高速、ステージ済みファイルの絞り込みと並列実行を持つので lint-staged が要らない）。.git/hooks/ に dagayn が入れた pre-commit と post-commit があり、core.hooksPath を使う方式にすると無効になる点に注意。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 lefthook.yml があり、pre-commit でステージ済みの TS/JS に oxlint と oxfmt --check、ステージ済みの Markdown に markdownlint-cli2 が走る
- [x] #2 pnpm install で lefthook のフックが自動で入る（prepare スクリプト等）。新しく clone した直後も手動手順が要らない
- [x] #3 dagayn の pre-commit・post-commit が、lefthook 導入後も動く（衝突しない）ことを確認している
- [x] #4 型チェックとテストは pre-commit に置かない（遅いため）。置く場合は pre-push とし、その判断を docs/dev/rules/workflow.md に書いている
- [x] #5 docs/dev/rules/workflow.md に、フックの導入と、CI との役割分担が書かれている
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
lefthook を devDependency に追加し、lefthook.yml の pre-commit でステージ済み TS/JS に oxlint・oxfmt --check、Markdown に markdownlint-cli2 を並列実行。prepare スクリプトで pnpm install 時に自動導入。lefthook install は既存 pre-commit を .old に退避して実行しないため、dagayn の pre-commit 相当を lefthook.yml のジョブに移した（post-commit は無傷）。検証: 不正な TS・裸メールの MD をステージしてコミットが拒否されること、dagayn ジョブが走ることを確認。型チェック・テストは置かず、判断を workflow.md に記載。
<!-- SECTION:FINAL_SUMMARY:END -->
