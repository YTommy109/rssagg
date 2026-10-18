---
id: TASK-19
title: アーカイブ保存（R2）
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
labels: []
dependencies:
  - TASK-7
  - TASK-16
priority: low
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
「後で読む」で保存した記事の全文を、元のサイトが消えても読めるように R2 へ残す。形式は TASK-7 の決定に従う（ADR-0003）。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 保存した記事の全文が、TASK-7 で決めた形式で R2 に保存され、saved.archive_key に入る
- [ ] #2 保存一覧からアーカイブを開いて読める
- [ ] #3 元の記事を取得できなかったとき、保存の操作が失敗として分かる
<!-- AC:END -->
