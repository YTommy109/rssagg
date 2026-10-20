---
id: TASK-35
title: 記事ごとの判定トグルのテストを補強する
status: To Do
assignee: []
created_date: '2026-10-20 13:27'
labels: []
dependencies: []
references:
  - test/judge-pending.spec.ts
  - src/routes/feeds-page.tsx
priority: low
type: task
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
test/judge-pending.spec.ts のトグルのテストは、オフにする PUT のステータスを検証しておらず、空ボディの PUT が 4xx を返しても DB が偶然 0 のままなら通る。また judge_each=1 のフィードを描画して checkbox が `checked` になることを確認するテストが無く、hono/jsx が `checked={false}` を `checked="false"` のような truthy 属性に描画しても検出できない。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 トグルをオフにする PUT のレスポンスステータスが検証されている
- [ ] #2 judge_each=1 のフィードを含む GET /settings/feeds の描画で、該当フィードの checkbox だけが checked になることが検証されている
<!-- AC:END -->
