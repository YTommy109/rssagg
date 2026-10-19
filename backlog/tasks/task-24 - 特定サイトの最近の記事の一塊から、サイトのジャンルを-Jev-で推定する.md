---
id: TASK-24
title: 特定サイトの最近の記事をまとめて Jev で判定する
status: To Do
assignee: []
created_date: '2026-10-19 02:55'
updated_date: '2026-10-19 02:58'
labels: []
dependencies:
  - TASK-21
  - TASK-17
priority: medium
type: feature
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
普段はサイト単位のジャンルで足りるが、あるサイトの最近の記事だけは中身で選別したいことがある。フィードを指定し、そのフィードの最近の記事（直近の一塊）を Jev でまとめて判定して、結果を記事一覧の絞り込みに反映する。TASK-22 の手動指定が 1 記事ずつなのに対し、こちらはフィード単位の一括。常時判定する設定（TASK-23）とは違い、押したときの 1 回だけ実行する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 フィード管理画面から、フィードと対象の範囲（直近 N 件）を指定して判定を実行できる
- [ ] #2 対象のうち判定済みの記事は再判定しない。1 回の実行で呼ぶ Jev の件数に上限があり、超える分は途中までの結果が残る
- [ ] #3 判定結果が記事一覧の絞り込みに反映される（優先順位は TASK-20 の ADR に従う）
- [ ] #4 途中で Jev が失敗しても、判定済みの分は残り、失敗した分を画面で確認できる
<!-- AC:END -->
