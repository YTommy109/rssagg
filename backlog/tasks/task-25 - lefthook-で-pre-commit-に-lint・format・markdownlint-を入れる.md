---
id: TASK-25
title: lefthook で pre-commit に lint・format・markdownlint を入れる
status: To Do
assignee: []
created_date: '2026-10-19 04:14'
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
- [ ] #1 lefthook.yml があり、pre-commit でステージ済みの TS/JS に oxlint と oxfmt --check、ステージ済みの Markdown に markdownlint-cli2 が走る
- [ ] #2 pnpm install で lefthook のフックが自動で入る（prepare スクリプト等）。新しく clone した直後も手動手順が要らない
- [ ] #3 dagayn の pre-commit・post-commit が、lefthook 導入後も動く（衝突しない）ことを確認している
- [ ] #4 型チェックとテストは pre-commit に置かない（遅いため）。置く場合は pre-push とし、その判断を docs/dev/rules/workflow.md に書いている
- [ ] #5 docs/dev/rules/workflow.md に、フックの導入と、CI との役割分担が書かれている
<!-- AC:END -->
