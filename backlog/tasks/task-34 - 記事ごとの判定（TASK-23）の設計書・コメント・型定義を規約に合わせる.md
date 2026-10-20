---
id: TASK-34
title: 記事ごとの判定の型定義と judgments.ts のコメントを規約に合わせる
status: To Do
assignee: []
created_date: '2026-10-20 13:27'
updated_date: '2026-10-20 13:31'
labels: []
dependencies: []
references:
  - docs/architecture.md
  - docs/dev/rules/comments.md
  - schema/schema.sql
  - src/jobs/judge.ts
  - src/db/articles.ts
priority: medium
type: chore
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
記事ごとの判定（定期クロール後の Jev 判定）のうち、次の点が規約（docs/dev/rules/comments.md）に合っていない。設計書の更新と、編集済みファイル内のタスク番号参照は feat/task23 ブランチで是正済み。

- `src/db/judgments.ts` の `isJudged` の TSDoc に「（TASK-22〜24）」というタスク番号参照がある。comments.md はコード内のタスク番号参照を禁じている（ADR 参照は可）。
- `{ id; title; excerpt }` の構造型が `src/db/articles.ts` に 2 箇所、`src/jobs/judge.ts` の `JudgeTarget` に 1 箇所と三重に定義されており、Jev に渡す項目を増やすと 3 箇所を編集する必要がある。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/db/judgments.ts のコメントにタスク番号参照が無い
- [ ] #2 Jev に渡す記事の型が db 層で一度だけ定義され、judge.ts はそれを import している
<!-- AC:END -->
