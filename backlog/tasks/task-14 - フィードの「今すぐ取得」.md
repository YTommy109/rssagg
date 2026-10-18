---
id: TASK-14
title: フィードの「今すぐ取得」
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
labels: []
dependencies:
  - TASK-4
  - TASK-12
priority: medium
type: enhancement
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
クロールは 1 時間ごとなので、フィードを登録しても結果を見るまで待つことになる。画面から今すぐ取得できれば、動きをその場で確認でき、取得に失敗した理由も追える。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 フィード一覧の各行から今すぐ取得でき、完了後に記事一覧へ反映される
- [ ] #2 定期クロールと同じ取得処理を使っている
- [ ] #3 取得に失敗したとき、理由が画面に表示される
<!-- AC:END -->
