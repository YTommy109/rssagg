---
id: TASK-26
title: フィード取得のレスポンスサイズに上限を設ける
status: Done
assignee:
  - '@claude'
created_date: '2026-10-19 04:21'
updated_date: '2026-10-19 11:28'
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
- [x] #1 上限（5MB を初期値とする）を超えるレスポンスは、パースせずにエラーとして扱い、`crawlAll` の `failed` に入る
- [x] #2 `Content-Length` が上限を超える場合は、本文を読み始める前に打ち切る
- [x] #3 `Content-Length` が無い・偽りの場合でも、ストリームで読みながらバイト数を数え、上限を超えた時点で打ち切る
- [x] #4 上限ちょうど・超過・`Content-Length` 無しの各ケースを vitest で確認する
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. crawl.ts に MAX_FEED_BYTES=5MB と readLimited(res) を追加。Content-Length 超過は本文を読まず cancel、無い/偽りの場合は reader でバイト数を数え超過で cancel して throw
2. arrayBuffer() を readLimited に置換
3. test/crawl.spec.ts に上限ちょうど・超過・Content-Length 無し・偽 Content-Length のケースを追加
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
crawl.ts に MAX_FEED_BYTES(5MB) と readLimited を追加。Content-Length 超過は本文を読まず cancel、無い/偽りの場合は for await で数えて超過時に throw（イテレータが body を cancel）。test/crawl.spec.ts に上限ちょうど・超過・Content-Length 超過（pull 未呼び出しを確認）・偽 Content-Length の 4 ケースを追加。lint / format:check / typecheck / test(85 件) すべて終了コード 0。
<!-- SECTION:FINAL_SUMMARY:END -->
