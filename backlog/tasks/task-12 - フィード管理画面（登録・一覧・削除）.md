---
id: TASK-12
title: フィード管理画面（登録・一覧・削除）
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
labels: []
dependencies:
  - TASK-11
  - TASK-3
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
フィードを登録できないと以降の機能に意味がない。TASK-3 の API を画面から使えるようにする。画面は HTML 断片を返す（ADR-0006）ので、既存の JSON API と別のルートにするか、同じルートで出し分けるかは着手時に決める。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 入力欄に URL を入れて登録すると、ページ全体を再読み込みせずに一覧へ追加される
- [ ] #2 一覧の各行から削除でき、削除した行が画面から消える
- [ ] #3 不正な URL や重複で登録できないとき、理由が画面に表示される
- [ ] #4 wrangler dev で実際に登録・削除して確認している
<!-- AC:END -->
