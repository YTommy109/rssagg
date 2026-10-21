---
id: TASK-32
title: 未判定記事の選択で、失敗し続ける記事が他の記事の判定を妨げないようにする
status: Done
assignee:
  - '@claude'
created_date: '2026-10-20 13:27'
updated_date: '2026-10-20 14:07'
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
- [x] #1 恒常的に失敗する記事があっても、それ以外の未判定記事が後続の定期実行で判定される
- [x] #2 1 時間あたりの流入が 1 回の上限を超えても、未判定記事がいずれ全て判定対象になる（取り残されない）
- [x] #3 恒常的に失敗する記事への Jev 呼び出しが、毎時繰り返されない（回数か間隔で抑えられている）
- [x] #4 失敗が続く記事が選択から外れる・戻る条件のテストがある
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. articles に judge_failures / judge_failed_at を追加（schema.sql → atlas migrate diff）
2. listUnjudgedArticles に now を渡し、失敗した記事を 1 時間 × 2^(失敗回数-1)（上限 64 時間）経つまで除外。順序は古い順（FIFO）にして流入超過でも取り残さない
3. judgePending で failed の記事の失敗回数と時刻を記録（judgeArticles は変えない）
4. テスト: 恒常失敗があっても他が判定される / 除外と復帰 / 古い順に選ぶ
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
順序を新しい順から取り込み順（a.id 昇順）に変えた。新しい順だと流入が上限を超え続けると古い記事に届かないため。新着の判定はバックログがある間は遅れる。失敗の記録は judgePending だけで行い、手動・まとめて判定（judgeArticles の他の呼び出し元）は変えていない。cron は Date.now() 基準なので、毎時の発火が 1 秒でも早いと 1 時間のバックオフが 2 周期分になるが、害は無いので許容した。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
articles に judge_failures / judge_failed_at を追加し（migration 20261020140439）、judgePending が失敗した記事を記録する。listUnjudgedArticles は失敗した記事を最後の失敗から 1 時間 × 2^(失敗回数-1)（上限 64 時間）経つまで除外し、取り込み順（古い順）で選ぶ。これで恒常的に失敗する記事が枠を占め続けず、Jev 呼び出しも最長 64 時間に 1 回に抑えられ、流入が上限を超えても古い記事が取り残されない。test/judge-pending.spec.ts に、恒常失敗があっても他が判定される・除外と復帰（1h→2h→上限 64h）・古い順に選ぶ、のテストを追加。pnpm run check は終了コード 0（107 tests passed）。
<!-- SECTION:FINAL_SUMMARY:END -->
