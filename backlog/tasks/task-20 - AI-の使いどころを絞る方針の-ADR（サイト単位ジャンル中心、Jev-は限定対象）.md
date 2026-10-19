---
id: TASK-20
title: AI の使いどころを絞る方針の ADR（サイト単位ジャンル中心、Jev は限定対象）
status: To Do
assignee: []
created_date: '2026-10-19 02:55'
labels: []
dependencies: []
documentation:
  - docs/jev-measurement.md
  - docs/adr/0002-ai-division.md
priority: high
type: spike
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-6 の実測で、Jev の費用は月数ドルで問題にならないと分かった。しかし全記事を判定する必要は無い。サイトごとに扱うジャンルはおおよそ決まっていて、大半はサイト単位で足りる。重複排除も記事の内容ではなく permalink（正規化 URL）の一致で十分で、TASK-5 の実装がすでにそれを満たす。ADR-0002 は「全記事を段階的に AI で判定する」前提で書かれているため、その前提を改める。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ADR-0002 を supersede する新しい ADR があり、次を決めている: (1) 選別の基本はサイト（フィード）単位のジャンル、(2) 重複排除は permalink のみ（埋め込み類似度と Jev の後段は採らない）、(3) Jev を使う対象は「複合的なサイト」「ユーザーが手動で指定した記事」「特定サイトの最近の記事の一塊」「常に判定が必要と指定したサイト」の 4 つ
- [ ] #2 ジャンルの持ち方（固定の語彙か、ユーザー定義か）と、サイト単位と記事単位が食い違うときの優先順位を決めている
- [ ] #3 docs/overview.md と docs/architecture.md の処理の流れ・未決事項を、新しい方針に合わせて直している
- [ ] #4 TASK-6 の実測（docs/jev-measurement.md）を根拠として参照している
<!-- AC:END -->
