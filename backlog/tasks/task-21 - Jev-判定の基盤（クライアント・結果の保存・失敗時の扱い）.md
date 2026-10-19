---
id: TASK-21
title: Jev 判定の基盤（クライアント・結果の保存・失敗時の扱い）
status: To Do
assignee: []
created_date: '2026-10-19 02:55'
labels: []
dependencies:
  - TASK-20
priority: high
type: task
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Jev を使う 3 つの機能（手動指定、複合サイト、サイトのジャンル推定）が共通して必要とする部分を先に作る。TASK-6 の measure.ts が叩いた POST /v1/systemone の呼び出し方と、docs/jev-measurement.md の知見（抜粋は過検出しやすく本文の方が安定、出力は課金されない）を土台にする。API キーは TASK-9 で配線済み。本番への登録は TASK-15 の側で行う。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Worker から Jev を呼ぶ関数があり、状態・問い・モデルを渡して答えとトークン使用量を返す
- [ ] #2 429 と 529 を指数バックオフで再試行し、それでも失敗したら呼び出し側へエラーを返す。Jev の失敗は記事の取り込みや画面表示を止めない
- [ ] #3 判定結果を judgments に保存できる。判定済みの記事を再判定しない
- [ ] #4 JEV_API_KEY が空のときの扱いが決まっている（判定を飛ばして警告を出す）
- [ ] #5 テストが、成功・再試行・失敗を fetch のモックで検証している（実 API は呼ばない）
<!-- AC:END -->
