---
id: TASK-28
title: htmx と Lism CSS を Worker に同梱して配信する
status: To Do
assignee: []
created_date: '2026-10-19 07:41'
labels: []
dependencies: []
priority: medium
type: task
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ADR-0012・ADR-0013 に沿って、htmx と CSS（Lism CSS + 自作 .c--*）を npm 依存として Worker に同梱し、同一オリジンから配信する。layout.tsx の CDN 読み込みと SRI は廃止する。同梱方法（wrangler の rules でテキスト import、または assets バインディング）は実装時に検証して選び、結果を ADR に反映する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 htmx.org と lism-css が package.json に版固定で入り、Worker の同一オリジンから配信される
- [ ] #2 layout.tsx の CDN の URL と SRI が無くなり、htmx の部分更新が動く
- [ ] #3 Access の前段を静的ファイルも通ることを確認している
- [ ] #4 vitest でも同梱した資産の配信をテストしている
- [ ] #5 feeds.tsx 1 画面に Lism のクラスを当て、CSS の読み込みを目視で確認している
<!-- AC:END -->
