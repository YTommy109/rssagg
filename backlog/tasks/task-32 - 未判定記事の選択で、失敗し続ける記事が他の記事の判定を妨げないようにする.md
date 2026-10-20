---
id: TASK-32
title: 未判定記事の選択で、失敗し続ける記事が他の記事の判定を妨げないようにする
status: To Do
assignee: []
created_date: '2026-10-20 13:27'
labels: []
dependencies:
  - TASK-31
references:
  - src/db/articles.ts
  - src/jobs/judge.ts
priority: high
type: bug
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
定期クロール後の判定は `listUnjudgedArticles` が新着順の上位 20 件を選ぶだけで、試行回数や再試行間隔を持たない。Jev が同じ入力に対して毎回失敗する記事（4xx や回答のスキーマ不一致など）が 20 件あると、毎時同じ 20 件を選んで全件失敗し、判定結果が書かれないので翌時間もまた同じ 20 件を選ぶ。その間、他の新しい記事も古い記事も判定されず、毎時 20 回の Jev 呼び出しが無駄になる。流入が 1 時間に 20 件を超える場合も、古い未判定記事には永遠に届かない。

「判定済み」の定義は TASK-31（該当なし回答の扱い）の結論で変わるため、その後に着手する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 恒常的に失敗する記事があっても、それ以外の未判定記事が後続の定期実行で判定される
- [ ] #2 1 時間あたりの流入が 1 回の上限を超えても、未判定記事がいずれ全て判定対象になる（取り残されない）
- [ ] #3 恒常的に失敗する記事への Jev 呼び出しが、毎時繰り返されない（回数か間隔で抑えられている）
- [ ] #4 失敗が続く記事が選択から外れる・戻る条件のテストがある
<!-- AC:END -->
