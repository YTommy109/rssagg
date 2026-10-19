---
id: TASK-27
title: フィード取得のリダイレクト先を検査する
status: To Do
assignee: []
created_date: '2026-10-19 04:21'
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
- [ ] #1 `redirect: manual` で取得し、`Location` を自前で追う
- [ ] #2 追う回数に上限を設ける（5 回を初期値とする）。超えたらエラーとして `failed` に入る
- [ ] #3 移動先の URL は `feedUrlSchema` に通し、通らなければエラーにする
- [ ] #4 相対 `Location` は取得元 URL を基準に解決する
- [ ] #5 正常な移動、回数超過、不正な移動先の各ケースを vitest で確認する
<!-- AC:END -->
