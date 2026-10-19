---
id: TASK-6
title: Jev による分類・除外判定の検証
status: Done
assignee:
  - '@claude'
created_date: '2026-10-13 13:10'
updated_date: '2026-10-19 02:48'
labels: []
dependencies:
  - TASK-9
  - TASK-4
priority: medium
type: spike
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
日本語記事で実トークン数と精度を測る。プラン・無料枠も確認する。TASK-17（選別）の分類方式を決める根拠になるため、実際にクロールした記事（TASK-4）を使って測る。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 実測トークン数と月額見積りを docs に記録
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
日本語 36 件で実測。抜粋 平均700tok、本文(8000字切り) 平均4073tok。月3万件で約$0.9 / $5.1。詳細は docs/jev-measurement.md
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
docs/jev-measurement.md に実測トークン数・月額見積り・精度・プランを記録。分類は抜粋で足りるが、広告判定は抜粋だと過検出する。無料枠は docs に記載なし。正解ラベル付きの再測定は TASK-17 で行う。
<!-- SECTION:FINAL_SUMMARY:END -->
