---
id: TASK-23
title: 複合的なサイト・常時判定が必要なサイトの記事を Jev で判定する
status: Done
assignee:
  - '@claude'
created_date: '2026-10-19 02:55'
updated_date: '2026-10-20 12:31'
labels: []
dependencies:
  - TASK-21
  - TASK-17
priority: medium
type: feature
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
複数ジャンルが混ざるサイト（総合ニュース、まとめ系など）や、読む人が「常に判定したい」と指定したサイトでは、サイト単位のジャンルでは足りない。そのフィードだけ、クロール時に新着記事を Jev で判定する。他のフィードには Jev を呼ばない。判定の入力は TASK-6 の実測に基づき、抜粋を基本とする（広告・PR の除外が要る場合のみ本文。本文は現在保存していない）。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 フィードに「記事ごとに判定する」を設定でき、設定したフィードの新着記事だけが Jev で判定される
- [x] #2 クロール時の判定が失敗しても、記事の取り込みは止まらない（判定は後の周期で再試行できる）
- [x] #3 1 回のクロールで呼ぶ Jev の件数に上限があり、上限を超えた分は次の周期に回る
- [x] #4 判定結果が記事一覧の絞り込みに反映される
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
feeds.judge_each を追加し、クロール後に judge_each=1 のフィードの未判定記事を新しい順に最大 20 件 Jev で判定する（judgePending）。判定失敗は取り込みに影響せず、未判定のまま次周期で再試行。判定結果は既存の COALESCE(j.topic, f.genre) 絞り込みに反映される。フィード行に「記事ごとに判定」チェックを追加。テスト 104 件・lint・typecheck 通過。既知: どのジャンルにも当てはまらない記事は未判定のまま毎周期再試行され上限を消費する（judge.ts に ponytail コメント）。
<!-- SECTION:FINAL_SUMMARY:END -->
