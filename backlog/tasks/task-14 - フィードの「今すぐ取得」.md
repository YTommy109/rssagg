---
id: TASK-14
title: フィードの「今すぐ取得」
status: Done
assignee:
  - '@claude'
created_date: '2026-10-18 13:13'
updated_date: '2026-10-19 08:55'
labels: []
dependencies:
  - TASK-4
  - TASK-12
priority: medium
type: enhancement
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
クロールは 1 時間ごとなので、フィードを登録しても結果を見るまで待つことになる。画面から今すぐ取得できれば、動きをその場で確認でき、取得に失敗した理由も追える。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 フィード一覧の各行から今すぐ取得でき、完了後に記事一覧へ反映される
- [x] #2 定期クロールと同じ取得処理を使っている
- [x] #3 取得に失敗したとき、理由が画面に表示される
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
フィード一覧の各行に「今すぐ取得」を追加。POST /settings/feeds/:id/fetch が定期クロールと同じ crawlFeed を呼び、成功時は更新後の行（タイトル反映）と「取得しました」を out-of-band で返す。失敗時は 502 で理由を #form-error に出し、前回の成功表示を消す（layout の htmx-config に 502 を追加）。実行中はボタンを無効化。検証: テスト 81 件通過（成功・失敗・404/400・401 を追加）、lint・format・型・md 通過、wrangler dev + ブラウザで実フィード（Hacker News）の取得→記事 20 件が一覧に反映、存在しないホストで失敗の理由が出ることを確認。
<!-- SECTION:FINAL_SUMMARY:END -->
