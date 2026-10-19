---
id: TASK-26
title: フィード取得のレスポンスサイズに上限を設ける
status: To Do
assignee: []
created_date: '2026-10-19 04:21'
labels: []
dependencies: []
references:
  - src/jobs/crawl.ts
priority: medium
type: task
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`crawlFeed`（src/jobs/crawl.ts）は `await res.arrayBuffer()` で本文を全部メモリに読む。登録した URL が巨大なレスポンスを返すと Worker のメモリ（128MB）を超え、そのフィードの取得が失敗する。失敗は `failed` に入るだけで他のフィードには波及しないが、毎時の cron で繰り返し失敗し、CPU 時間とコストを無駄にする。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 上限（5MB を初期値とする）を超えるレスポンスは、パースせずにエラーとして扱い、`crawlAll` の `failed` に入る
- [ ] #2 `Content-Length` が上限を超える場合は、本文を読み始める前に打ち切る
- [ ] #3 `Content-Length` が無い・偽りの場合でも、ストリームで読みながらバイト数を数え、上限を超えた時点で打ち切る
- [ ] #4 上限ちょうど・超過・`Content-Length` 無しの各ケースを vitest で確認する
<!-- AC:END -->
