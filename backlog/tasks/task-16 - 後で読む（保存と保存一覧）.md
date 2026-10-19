---
id: TASK-16
title: 後で読む（保存と保存一覧）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-18 13:13'
updated_date: '2026-10-19 08:27'
labels: []
dependencies:
  - TASK-13
priority: medium
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
気になる記事を残しておく機能。saved テーブルは既にある。アーカイブ形式が未決（TASK-7）なので、ここでは保存の印だけを付け、全文の保存は別タスクにする。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 記事一覧の各行から保存でき、保存を取り消せる
- [x] #2 保存した記事だけを並べた一覧が見られる
- [x] #3 記事一覧で、保存済みの記事が分かる
- [x] #4 保存しても saved.archive_key は NULL のまま（全文の保存は扱わない）
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
記事一覧の各行に「後で読む」ボタンを追加し、PUT/DELETE /articles/:id/saved で保存・取り消し（更新後の行を返して htmx が差し替え）。/articles/saved に保存した記事だけの一覧（保存の新しい順）、ナビに「後で読む」リンク。一覧の各行は saved の有無を EXISTS で持ち、保存済みは「★ 保存済み（取り消す）」と表示。saved.archive_key は NULL のまま。検証: テスト 78 件通過（saved.spec.ts を追加）、lint・format・型・md 通過、wrangler dev + ブラウザで保存→一覧→取り消しを確認。
<!-- SECTION:FINAL_SUMMARY:END -->
