---
id: TASK-5
title: 重複排除（URL正規化→本文ハッシュ）
status: To Do
assignee: []
created_date: '2026-10-13 13:10'
updated_date: '2026-10-18 13:13'
labels: []
dependencies:
  - TASK-4
  - TASK-13
priority: medium
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ADR-0002 の段階式のうち、前段の URL 正規化と本文ハッシュだけを扱う。記事一覧に複数のフィードの同じ記事が並ぶのを、実データで確かめながら減らす。埋め込み類似度と Jev の後段は TASK-18。Jev を使わないので TASK-9 には依存しない。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 同一記事が複数フィードから来ても 1 件になる
<!-- AC:END -->
