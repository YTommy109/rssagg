---
id: TASK-22
title: 手動で指定した記事を Jev で判定する
status: Done
assignee: []
created_date: '2026-10-19 02:55'
updated_date: '2026-10-20 11:37'
labels: []
dependencies:
  - TASK-21
  - TASK-17
priority: medium
type: feature
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
サイト単位のジャンルでは拾えない記事を、読む人が自分で「この記事を判定して」と指定できるようにする。全記事を自動で判定するのではなく、指定した記事だけが Jev の対象になる。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 記事一覧の各記事から、判定を依頼できる（htmx で、一覧を再読み込みせずに結果が出る）
- [x] #2 判定結果（ジャンルと確率）が、その記事に表示される。以後の絞り込みで、サイト単位のジャンルより記事単位の判定を優先する（優先順位は TASK-20 の ADR に従う）
- [x] #3 Jev が失敗したら、その旨を画面に出し、記事はそのまま残る
- [x] #4 同じ記事を二重に依頼しても、Jev を再度呼ばない
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
記事一覧の各行に「判定する」ボタン（hx-post /articles/:id/judgment、行ごと差し替え）を追加。対象 1 件を judgeArticles（TASK-21）で判定し、最高確率のジャンルと確率を行に表示する。一覧の絞り込みは COALESCE(記事の判定ジャンル, フィードのジャンル) で行い、記事単位を優先（ADR-0011）。Jev 失敗・キー未設定時は行を残して失敗文言を出し、再依頼できる。判定済みは judgeArticles の isJudged で Jev を呼ばない。検証: test/judgment.spec.ts の 3 件（判定表示と二重依頼で呼び出し 1 回、絞り込みの優先、失敗時の表示）を含め、lint / format:check / lint:md / typecheck / test(99 件) が終了コード 0。注意: 同一記事への同時リクエストは isJudged の確認と保存の間で競合しうる（逐次の二重クリックは防げる）。実 API は未確認。
<!-- SECTION:FINAL_SUMMARY:END -->
