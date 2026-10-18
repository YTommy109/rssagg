---
id: TASK-4
title: 定期クロール（Cron 1h）
status: To Do
assignee: []
created_date: '2026-10-13 13:10'
updated_date: '2026-10-18 13:13'
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
- [ ] #1 更新のないフィードは本文を再取得しない
- [ ] #2 手動で実行すると（wrangler dev --test-scheduled）、登録済みフィードの記事が articles に保存される
- [ ] #3 取得に失敗したフィードがあっても、ほかのフィードの取得は続く
<!-- AC:END -->
