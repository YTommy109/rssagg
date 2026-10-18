---
id: TASK-17
title: 内容ベースの選別（分類と除外）
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
labels: []
dependencies:
  - TASK-6
  - TASK-13
priority: medium
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
このツールの中心機能。トピックで読む・読まないを決める。分類方式（固定トピック・自由タグ・ユーザー定義）は未決で、TASK-6 の実測をもとに決めて ADR にする。大きければ着手時に分割する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 分類方式を決め、TASK-6 の実測を根拠に ADR へ記録している
- [ ] #2 クロール後の記事に Jev の判定（トピックごとの確率）が judgments へ保存される
- [ ] #3 画面でトピックの include と exclude を設定でき、記事一覧が設定に従って絞り込まれる
- [ ] #4 判定が失敗しても、記事の取り込みは止まらない
- [ ] #5 本番に JEV_API_KEY を登録している（手順は docs/dev/secrets.md）
<!-- AC:END -->
