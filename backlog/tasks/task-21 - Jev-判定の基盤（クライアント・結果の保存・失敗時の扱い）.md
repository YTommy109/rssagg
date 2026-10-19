---
id: TASK-21
title: Jev 判定の基盤（クライアント・結果の保存・失敗時の扱い）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-19 02:55'
updated_date: '2026-10-19 06:13'
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
- [x] #1 Worker から Jev を呼ぶ関数があり、状態・問い・モデルを渡して答えとトークン使用量を返す
- [x] #2 429 と 529 を指数バックオフで再試行し、それでも失敗したら呼び出し側へエラーを返す。Jev の失敗は記事の取り込みや画面表示を止めない
- [x] #3 判定結果を judgments に保存できる。判定済みの記事を再判定しない
- [x] #4 JEV_API_KEY が空のときの扱いが決まっている（判定を飛ばして警告を出す）
- [x] #5 テストが、成功・再試行・失敗を fetch のモックで検証している（実 API は呼ばない）
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. src/ai/jev.ts: askJev(apiKey, {state, questions, model?}, opts) で POST /v1/systemone を呼び、answers と usage を返す。429/529 は指数バックオフで再試行（既定 3 回）、それ以外の非 2xx と再試行切れは JevError(status) を投げる
2. src/db/judgments.ts: judgedArticleIds（判定済みの記事 id の集合）と upsertJudgmentStatements（topic ごとの score を保存）
3. src/jobs/judge.ts: judgeArticles(db, apiKey, articles, genres, now)。JEV_API_KEY が空なら console.warn して skipped を返す。判定済みは除き、記事ごとに title+excerpt を state、ジャンル一覧+該当なしを choice の criteria にして問い、probabilities を judgments に保存する。1 件の失敗は記録して残りを続け、呼び出し側へは投げない
4. テスト: src/ai/jev.spec.ts（fetch モックで成功・429→成功の再試行・529 連続での失敗・401 の即時失敗）、test/judge.spec.ts（空キーのスキップ、判定済みの除外、一部失敗時の継続と保存内容）
5. docs/dev/secrets.md に JEV_API_KEY が空のときの挙動を 1 行足す
6. lint / format:check / lint:md / typecheck / test を終了コード付きで実行する
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
採用した方針: 3 層に分けた。src/ai/jev.ts は HTTP の往復だけ（askJev: state・questions・model を送り answers と usage を返す。429/529 は 1s→2s→4s の指数バックオフで既定 3 回再試行し、それ以外の非 2xx と再試行切れは JevError(status) を投げる。応答は zod で検証）。src/db/judgments.ts は isJudged と saveJudgments（1 記事分を 1 バッチで INSERT OR REPLACE）。src/jobs/judge.ts の judgeArticles が、空キー・空ジャンルなら console.warn して skipped を返し、判定済みは除き、記事ごとに逐次で問い、1 件の失敗は記録して続ける（呼び出し側へ投げない）。

問いの設計（TASK-22〜24 が見直してよい既定値）: state は {title, excerpt}（抜粋で分類は足りる: docs/jev-measurement.md）。問いはジャンル一覧 + 「該当なし」を criteria にした choice 1 問。probabilities をジャンルごとに judgments(topic, score) へ保存し、「該当なし」は保存しない（judgments.topic はジャンルの語彙と共有する: ADR-0011）。「判定済み」は topic を問わず行が 1 つでもあること。ジャンルが後から増えても再判定しないので、必要なら呼び出し側が先に行を消す。

判定済みの確認は IN (?,...) ではなく記事ごとに 1 クエリにした。逐次ループなので往復は増えず、D1 のバインド上限（100）に当たらない。

検証: lint / format:check / lint:md / typecheck / test がすべて終了コード 0（test は 11 ファイル 73 件）。空振り確認として、再試行を外す（RETRY_STATUSES を空に）と jev.spec の「429 と 529 は待って再試行し、通ったら返す」「再試行しても通らなければ JevError を投げる」が落ち、isJudged と「該当なし」の除外を外すと judge.spec の「判定済みは飛ばし、失敗した記事があっても残りを保存して報告する」が落ちることを実測した（3 failed / 5 passed）。

docs: architecture.md の選別の行に jev.ts / judge.ts の所在を足した。overview.md は処理の流れが変わらないので触っていない。ADR は追加しない（ADR-0011 の範囲内）。

追記: 未登録の Secret は env に無く undefined になるため、apiKey の型を string | undefined にして空文字と同じく判定を飛ばす（guard は !apiKey）。テストは '' と undefined の両方で確かめる。askJev の最悪の待ち時間はバックオフ約 7 秒 + タイムアウト 30 秒 × 最大 4 回。画面の要求の中で呼ぶ TASK-22 では retries を小さくするか検討する。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Jev を使う 3 機能（TASK-22〜24）の共通部分を作った。src/ai/jev.ts（askJev: POST /v1/systemone、429/529 の指数バックオフ再試行、JevError、zod による応答検証）、src/db/judgments.ts（isJudged、saveJudgments）、src/jobs/judge.ts（judgeArticles: 空キー・空ジャンルは警告してスキップ、判定済みは除外、記事ごとの失敗は記録して継続）。問いはジャンル + 該当なしの choice で、確率を judgments に保存する。
検証: 5 つのチェックが終了コード 0、テスト 73 件。再試行・判定済み除外・該当なしの除外を外すと対応するテストが落ちることを実測した。
残る注意: 本番の JEV_API_KEY は未登録（TASK-15 で登録）。登録が無いと判定は warn を残して飛ぶ。cron や画面からの呼び出しは TASK-22〜24 で足す。実 API での動作は未確認（fetch モックのみ）。
<!-- SECTION:FINAL_SUMMARY:END -->
