---
id: TASK-13
title: 記事一覧画面
status: Done
assignee:
  - '@claude'
created_date: '2026-10-18 13:13'
updated_date: '2026-10-18 14:49'
labels: []
dependencies:
  - TASK-4
  - TASK-11
priority: high
type: feature
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
クロールで集めた記事を読む画面が無いと、クロールの成否も確認できない。フィード登録 → クロール → 記事一覧、の最小の一通りがここで繋がる。選別・重複排除・後で読むは、この画面に載せていく。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 記事が新しい順（公開日時、無ければ取得日時）に表示される
- [x] #2 各行にタイトル・配信元フィード名（無ければ URL）・日時が出て、タイトルから元の記事へ移れる
- [x] #3 記事が無いときは、空であることが分かる表示になる
- [x] #4 一度に表示する件数に上限がある（続きの読み込みは扱わない）
- [x] #5 フィードを登録し、クロールして、記事一覧に出るまでを wrangler dev で通しで確認している
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. db/articles.ts: 新しい順（COALESCE(published_at, fetched_at)）で上限 50 件、feeds を JOIN
2. views/articles.tsx と / のルートを記事一覧に置換（空表示、http(s) 以外は非リンク）
3. テスト + wrangler dev で通し確認
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
pnpm run check 通過（53 tests）。wrangler dev で 登録(201)→scheduled→/ に記事とフィード名・日時が出ることを確認。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
/ を記事一覧に置換。新しい順（COALESCE(published_at, fetched_at)）で 50 件上限、フィード名（無ければ URL）・日時（JST）・タイトルのリンク。記事 URL はフィード由来のため http(s) 以外はリンクにしない。空のときは案内を表示。続きの読み込みは未対応。
<!-- SECTION:FINAL_SUMMARY:END -->
