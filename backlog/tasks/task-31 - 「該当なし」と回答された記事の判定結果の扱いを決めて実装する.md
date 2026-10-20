---
id: TASK-31
title: 「該当なし」と回答された記事の判定結果の扱いを決めて実装する
status: To Do
assignee: []
created_date: '2026-10-20 13:27'
updated_date: '2026-10-20 13:27'
labels: []
dependencies: []
references:
  - src/jobs/judge.ts
  - src/db/judgments.ts
  - docs/adr/README.md
priority: high
type: bug
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Jev が「該当なし」を最大スコアで返した記事（例: 該当なし 0.9, tech 0.05, sports 0.05）は、現状 `judgeOne` が「該当なし」キーを落とした残りをそのまま保存する。その結果、記事は判定済み扱いになり、記事一覧は MAX(score) で tech 0.05 として選別する。記事ごとに判定するフィードは雑多なサイトなので、これが多数派のケースになる。

`src/jobs/judge.ts` の該当箇所のコメントと TASK-23 の Final Summary は「該当なしだと保存されず再試行される（上限を消費する）」と説明しているが、その挙動は起きていない。説明と実装のどちらに合わせるかは未決定で、本タスクで決める。候補は (a) 該当なしが最大なら保存せず未判定のまま残す、(b) 該当なしとして保存し以後スキップする、の 2 つ。どちらを採るかは TASK-32（未判定キューの飢餓）の「判定済みとは何か」にも影響する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 「該当なし」が最大スコアの記事が、低スコアのジャンルに誤って分類されて記事一覧に出ることがない
- [ ] #2 決めた扱い（保存しないか、該当なしとして保存するか）が `src/jobs/judge.ts` のコメントと docs/ 配下の該当文書で一致して説明されている
- [ ] #3 「該当なし」が最大スコアのケースのテストがあり、決めた扱いを検証している
- [ ] #4 TASK-23 の Final Summary の誤った説明が訂正されている
<!-- AC:END -->
