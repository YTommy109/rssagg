---
id: TASK-22
title: 手動で指定した記事を Jev で判定する
status: To Do
assignee: []
created_date: '2026-10-19 02:55'
labels: []
dependencies:
  - TASK-21
  - TASK-17
priority: medium
type: feature
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
サイト単位のジャンルでは拾えない記事を、読む人が自分で「この記事を判定して」と指定できるようにする。全記事を自動で判定するのではなく、指定した記事だけが Jev の対象になる。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 記事一覧の各記事から、判定を依頼できる（htmx で、一覧を再読み込みせずに結果が出る）
- [ ] #2 判定結果（ジャンルと確率）が、その記事に表示される。以後の絞り込みで、サイト単位のジャンルより記事単位の判定を優先する（優先順位は TASK-20 の ADR に従う）
- [ ] #3 Jev が失敗したら、その旨を画面に出し、記事はそのまま残る
- [ ] #4 同じ記事を二重に依頼しても、Jev を再度呼ばない
<!-- AC:END -->
