---
id: TASK-31
title: 「該当なし」と回答された記事の判定結果の扱いを決めて実装する
status: Done
assignee:
  - '@claude'
created_date: '2026-10-20 13:27'
updated_date: '2026-10-20 13:48'
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
- [x] #1 「該当なし」が最大スコアの記事が、低スコアのジャンルに誤って分類されて記事一覧に出ることがない
- [x] #2 決めた扱い（保存しないか、該当なしとして保存するか）が `src/jobs/judge.ts` のコメントと docs/ 配下の該当文書で一致して説明されている
- [x] #3 「該当なし」が最大スコアのケースのテストがあり、決めた扱いを検証している
- [x] #4 TASK-23 の Final Summary の誤った説明が訂正されている
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 方針は (b)「該当なし」として保存し以後スキップ。(a) は該当なしが多数派のフィードで毎時同じ記事を再判定し、TASK-32 の飢餓を悪化させるため採らない
2. judgeOne が「該当なし」を落とすフィルタを消し、全確率を保存する。一覧の MAX(score) が topic=該当なし を選び、include 絞り込みでは隠れる。SQL・スキーマ・画面は変更なし
3. judge.ts のコメント、ADR（新規）と architecture.md を新しい挙動に合わせる
4. 該当なしが最大のケースのテスト（保存行・一覧の include/無指定・再判定しない）を追加
5. TASK-23 の Final Summary を訂正
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
workers-reviewer の指摘を反映: サイト単位のジャンルより記事単位の該当なしが優先することを ADR に明記、同点時は SQLite 実装依存である旨を ADR に記録（ROW_NUMBER 化は問題が出たら）、テストの同点を解消し judgePending 経路のテストを追加。旧実装に戻すと追加テスト 2 件が失敗することを確認済み。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
方針 (b) を採用: Jev の「該当なし」も他のジャンルと同じく judgments に保存する（judgeOne のフィルタを削除しただけで、SQL・スキーマ・画面は変更なし）。該当なしが最大の記事は一覧で judged_genre=該当なし となり include の絞り込みで隠れ、行があるので判定済みとして再判定しない。(a) 保存しない案は、該当なしが多数派のフィードで毎時同じ記事を再判定し上限を使い切るため不採用。決定は ADR-0015、architecture.md、judge.ts のコメントに記載。TASK-23 の Final Summary を訂正。

TASK-32 向け: 判定済み＝judgments に 1 行でもある（該当なしを含む）。

検証: lint / format:check / lint:md / typecheck / test（106 件）すべて終了コード 0。既知: 該当なしとジャンルの同点時の選択は SQLite 実装依存、既存の行は移行しない（ADR-0015 の影響）。
<!-- SECTION:FINAL_SUMMARY:END -->
