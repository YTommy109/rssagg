---
id: TASK-17
title: サイト単位のジャンルによる選別（Jev 不使用）
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
updated_date: '2026-10-19 02:55'
labels: []
dependencies:
  - TASK-20
  - TASK-13
priority: high
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
このツールの中心機能。トピックで読む・読まないを決める。サイトごとにおおよそのジャンルが決まっているので、記事ではなくフィード（サイト）にジャンルを付け、それで記事一覧を絞る。AI を呼ばないので費用もレイテンシも要らず、判定の失敗も起きない。複合的なサイトや個別記事の判定は別タスク（Jev を使う）で足し、この選別の仕組みに載せる。ジャンルの持ち方は TASK-20 の ADR で決める。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 フィード管理画面で、フィードにジャンルを設定・変更できる
- [ ] #2 記事一覧で、ジャンルの include / exclude を設定でき、設定に従って記事が絞り込まれる
- [ ] #3 ジャンル未設定のフィードの記事は、絞り込みの対象外として扱う（隠れない）。その扱いが画面か docs で分かる
- [ ] #4 スキーマ変更はマイグレーションで行う
- [ ] #5 テストが、絞り込みの include / exclude と未設定の扱いを検証している
<!-- AC:END -->
