---
id: TASK-9
title: Jev API キーの管理方針を決め、Workers Secrets で配線する
status: To Do
assignee: []
created_date: '2026-10-13 13:40'
labels: []
dependencies:
  - TASK-1
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Jev（TypeSafe）の API キーを `.env` で持ちたくない。Cloudflare 側にシークレット管理機能があるため、置き場所を決めてから Jev 呼び出し（TASK-5 / TASK-6）に使う。候補は Workers Secrets（`wrangler secret put`、ローカルは `.dev.vars`）と Secrets Store（アカウント共通、binding 経由で `await env.X.get()`）。Worker 1 つなら Workers Secrets で足りるという見立て。Secrets Store は調査時点でベータだったため、採用するなら GA 状況を公式ドキュメントで再確認する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 採用方式（Workers Secrets か Secrets Store）が ADR または docs/architecture.md に理由つきで記録されている
- [ ] #2 `.dev.vars` が `.gitignore` に入り、リポジトリに API キーの実値が含まれない
- [ ] #3 `JEV_API_KEY` が Env の型に定義され、本番への登録手順（`wrangler secret put` など）が docs に書かれている
<!-- AC:END -->
