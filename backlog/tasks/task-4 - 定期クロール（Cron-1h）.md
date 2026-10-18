---
id: TASK-4
title: 定期クロール（Cron 1h）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-13 13:10'
updated_date: '2026-10-18 14:47'
labels: []
dependencies:
  - TASK-3
priority: high
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
条件付き GET（ETag/If-Modified-Since）、並列数制限、パース、記事保存。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 更新のないフィードは本文を再取得しない
- [x] #2 手動で実行すると（wrangler dev --test-scheduled）、登録済みフィードの記事が articles に保存される
- [x] #3 取得に失敗したフィードがあっても、ほかのフィードの取得は続く
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. feeds に etag / last_modified を追加（Atlas マイグレーション）
2. fast-xml-parser で RSS2.0/Atom をパースする src/crawl/parse.ts
3. 条件付き GET・並列数制限・記事保存の src/crawl/crawl.ts（失敗はフィード単位で隔離）
4. index.ts に scheduled を追加、wrangler.jsonc に cron 0 * * * *
5. テスト（fetch をスタブ）
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
pnpm run check 通過（49 tests）。wrangler dev --test-scheduled で /cdn-cgi/handler/scheduled を叩き、ローカル D1 に記事と etag/last_modified が保存されることを確認。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
feeds に etag/last_modified を追加（マイグレーション）。fast-xml-parser で RSS/Atom をパースし、毎時 cron（scheduled）で条件付き GET・6 並列・記事保存を行う。失敗はフィード単位で隔離。etag 更新は記事保存と同一バッチで、取りこぼしを防ぐ。リスク: 取得失敗の履歴は未保存（ログのみ）。
<!-- SECTION:FINAL_SUMMARY:END -->
