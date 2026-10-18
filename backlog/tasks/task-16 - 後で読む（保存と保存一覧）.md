---
id: TASK-16
title: 後で読む（保存と保存一覧）
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
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
- [ ] #1 記事一覧の各行から保存でき、保存を取り消せる
- [ ] #2 保存した記事だけを並べた一覧が見られる
- [ ] #3 記事一覧で、保存済みの記事が分かる
- [ ] #4 保存しても saved.archive_key は NULL のまま（全文の保存は扱わない）
<!-- AC:END -->
