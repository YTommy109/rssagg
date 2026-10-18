---
id: TASK-13
title: 記事一覧画面
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
labels: []
dependencies:
  - TASK-4
  - TASK-11
priority: high
type: feature
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
クロールで集めた記事を読む画面が無いと、クロールの成否も確認できない。フィード登録 → クロール → 記事一覧、の最小の一通りがここで繋がる。選別・重複排除・後で読むは、この画面に載せていく。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 記事が新しい順（公開日時、無ければ取得日時）に表示される
- [ ] #2 各行にタイトル・配信元フィード名（無ければ URL）・日時が出て、タイトルから元の記事へ移れる
- [ ] #3 記事が無いときは、空であることが分かる表示になる
- [ ] #4 一度に表示する件数に上限がある（続きの読み込みは扱わない）
- [ ] #5 フィードを登録し、クロールして、記事一覧に出るまでを wrangler dev で通しで確認している
<!-- AC:END -->
