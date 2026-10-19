---
id: TASK-23
title: 複合的なサイト・常時判定が必要なサイトの記事を Jev で判定する
status: To Do
assignee: []
created_date: '2026-10-19 02:55'
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
- [ ] #1 フィードに「記事ごとに判定する」を設定でき、設定したフィードの新着記事だけが Jev で判定される
- [ ] #2 クロール時の判定が失敗しても、記事の取り込みは止まらない（判定は後の周期で再試行できる）
- [ ] #3 1 回のクロールで呼ぶ Jev の件数に上限があり、上限を超えた分は次の周期に回る
- [ ] #4 判定結果が記事一覧の絞り込みに反映される
<!-- AC:END -->
