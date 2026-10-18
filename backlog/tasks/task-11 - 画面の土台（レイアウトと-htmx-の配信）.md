---
id: TASK-11
title: 画面の土台（レイアウトと htmx の配信）
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
labels: []
dependencies: []
priority: high
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
フィード登録 API はあるが画面が無く、動きをブラウザで確認できない。ADR-0006 の htmx・hyperscript を載せる最小の土台を作り、以降の画面タスクが乗れるようにする。htmx の配信方式（CDN か Workers の静的アセットか）はここで決める。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ブラウザで / を開くと、共通レイアウトのページが表示される（Access 検証の背後）
- [ ] #2 htmx のリクエストで HTML 断片を差し替える動きを 1 つ、画面で確認できる
- [ ] #3 htmx の配信方式を理由つきで ADR か docs に記録している
- [ ] #4 wrangler dev で実際に表示して確認している
<!-- AC:END -->
