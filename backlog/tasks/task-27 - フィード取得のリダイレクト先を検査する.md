---
id: TASK-27
title: フィード取得のリダイレクト先を検査する
status: Done
assignee:
  - '@claude'
created_date: '2026-10-19 04:21'
updated_date: '2026-10-19 12:13'
labels: []
dependencies: []
references:
  - src/jobs/crawl.ts
  - src/domain/feed-input.ts
priority: medium
type: task
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`fetch` は既定で `redirect: follow`（最大 20 回）のため、登録時に `feedUrlSchema` で検証した URL と、実際に取得する先が一致しない。移動先が http/https 以外や認証情報つきでも、検査されずに追われる。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `redirect: manual` で取得し、`Location` を自前で追う
- [x] #2 追う回数に上限を設ける（5 回を初期値とする）。超えたらエラーとして `failed` に入る
- [x] #3 移動先の URL は `feedUrlSchema` に通し、通らなければエラーにする
- [x] #4 相対 `Location` は取得元 URL を基準に解決する
- [x] #5 正常な移動、回数超過、不正な移動先の各ケースを vitest で確認する
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. crawl.ts に fetchFollowing を追加: redirect:manual で取得し、3xx の Location を new URL(loc, 現在URL) で解決→feedUrlSchema で検査、最大5回
2. crawlFeed の fetch を置換
3. crawl.spec.ts に正常な移動・相対Location・回数超過・不正な移動先(file:/認証情報)を追加
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
crawl.ts に fetchFollowing と resolveRedirect を追加。redirect:manual で取得し、3xx の Location を取得元 URL 基準で解決して feedUrlSchema に通し、最大5回まで追う。超過・不正な移動先(file:/認証情報/解釈不能)はエラーで failed に入る。crawl.spec.ts に正常な移動(相対 Location 含む)・回数超過・不正な移動先3種を追加。lint/format:check/typecheck/test(90件)すべて終了コード 0。
<!-- SECTION:FINAL_SUMMARY:END -->
