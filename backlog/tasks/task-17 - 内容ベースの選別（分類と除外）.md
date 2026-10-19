---
id: TASK-17
title: サイト単位のジャンルによる選別（Jev 不使用）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-18 13:13'
updated_date: '2026-10-19 05:13'
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
- [x] #1 フィード管理画面で、フィードにジャンルを設定・変更できる
- [x] #2 記事一覧で、ジャンルの include / exclude を設定でき、設定に従って記事が絞り込まれる
- [x] #3 ジャンル未設定のフィードの記事は、絞り込みの対象外として扱う（隠れない）。その扱いが画面か docs で分かる
- [x] #4 スキーマ変更はマイグレーションで行う
- [x] #5 テストが、絞り込みの include / exclude と未設定の扱いを検証している
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
feeds.genre（自由文字列・NULL可）をマイグレーションで追加。フィード管理画面の行にジャンル入力（datalist で既存候補）を置き PUT /settings/feeds/:id/genre で保存。記事一覧は ?include=&exclude= の GET フォームで絞り込み（exclude 優先、未設定フィードは常に表示。画面に注記）。test/genre.spec.ts で include/exclude/未設定/設定変更を検証。lint・format・lint:md・typecheck・test（64件）すべて exit 0。
<!-- SECTION:FINAL_SUMMARY:END -->
