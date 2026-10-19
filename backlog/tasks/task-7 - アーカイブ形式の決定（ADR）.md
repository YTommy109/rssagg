---
id: TASK-7
title: アーカイブ形式の決定（ADR）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-13 13:10'
updated_date: '2026-10-19 08:44'
labels: []
dependencies: []
priority: low
type: spike
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Markdown / .webarchive / PDF を比較して ADR 化。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 アーカイブ形式を ADR で決め、TASK-19 が着手できる
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Markdown / .webarchive / PDF（と HTML 単体）を、自己完結性・Cloudflare での生成可否・閲覧・ローカルでのテストの観点で比較する（Cloudflare docs で確認）
2. docs/adr/0014-archive-format.md に決定を書き、README と architecture.md の「形式は未決」を更新する
3. 実装は TASK-19 に残す（R2 バインディング・取得・変換の試作は行わない）
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ADR-0014（提案）を作成。Markdown 採用、PDF・.webarchive・HTML 単体は却下。ユーザーの承認後に Done にする。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ADR-0014 で、本文を Markdown で R2 に保存すると決定。画像と体裁は保存しない（Instapaper も同様の構成と観察）。PDF・.webarchive・HTML 単体は却下理由つきで記録。取得・抽出の方法は TASK-19 で試作して選ぶ。README と architecture.md の「形式は未決」を更新。
<!-- SECTION:FINAL_SUMMARY:END -->
