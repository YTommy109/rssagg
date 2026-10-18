---
id: TASK-15
title: 本番への初回公開と実機での確認
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
labels: []
dependencies:
  - TASK-13
priority: medium
type: task
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ローカルで一通り動いた段階で、実際の環境で使えることを確かめる。CI の deploy ジョブはあるが、Access アプリケーションの設定と JWT 検証を本番で通した確認はまだ無い（ADR-0005）。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Access で許可したメールでログインすると画面が開き、未ログインや許可外のメールでは開けない
- [ ] #2 本番でフィードを登録し、Cron の実行後に記事一覧へ記事が出る
- [ ] #3 本番で必要な設定の抜けがあれば docs に手順を追記している
<!-- AC:END -->
