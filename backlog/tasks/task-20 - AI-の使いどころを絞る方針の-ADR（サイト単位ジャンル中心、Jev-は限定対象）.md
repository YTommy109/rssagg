---
id: TASK-20
title: AI の使いどころを絞る方針の ADR（サイト単位ジャンル中心、Jev は限定対象）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-19 02:55'
updated_date: '2026-10-19 04:49'
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
- [x] #1 ADR-0002 を supersede する新しい ADR があり、次を決めている: (1) 選別の基本はサイト（フィード）単位のジャンル、(2) 重複排除は permalink のみ（埋め込み類似度と Jev の後段は採らない）、(3) Jev を使う対象は「複合的なサイト」「ユーザーが手動で指定した記事」「特定サイトの最近の記事の一塊」「常に判定が必要と指定したサイト」の 4 つ
- [x] #2 ジャンルの持ち方（固定の語彙か、ユーザー定義か）と、サイト単位と記事単位が食い違うときの優先順位を決めている
- [x] #3 docs/overview.md と docs/architecture.md の処理の流れ・未決事項を、新しい方針に合わせて直している
- [x] #4 TASK-6 の実測（docs/jev-measurement.md）を根拠として参照している
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. docs/adr/0011-ai-scope.md を新規作成する（状態: 採用、ADR-0002 を置換）。決めること: (1) 選別の基本はフィード単位のジャンル (2) 重複排除は正規化 URL（permalink）のみで、埋め込み類似度と Jev の後段は採らない (3) Jev を使う対象は 4 つ（複合的なサイト／手動指定の記事／特定サイトの最近の記事の一塊／常に判定が必要と指定したサイト）
2. ジャンルの持ち方（案）: ユーザー定義の自由文字列。feeds に genre を 1 つ（NULL 可）持つ。judgments.topic が既に自由文字列なので同じ語彙を共有する。固定語彙にしないのは、サイトごとの粒度が人によって違い、語彙を先に決めても足りなくなるため。表記ゆれは UI で既存ジャンルから選ばせて抑える（実装は TASK-17）
3. 食い違い時の優先順位（案）: 記事単位の判定（judgments）> フィード単位のジャンル。手動指定は Jev の自動判定より優先。ジャンル未設定のフィードは絞り込みの対象外（TASK-17 AC#3 と一致）
4. ADR-0002 の状態を「置換（0011）」に直し、docs/adr/README.md の表に 0011 を足す。ADR-0003 の Vectorize（重複判定用の埋め込み）は使わなくなるので、0011 の影響欄に明記する（0003 本体は書き換えない）
5. docs/overview.md を直す: 「内容ベースの選別」の説明と非目標（配信元単位を主軸にしない）を、サイト単位のジャンルを基本とする方針に合わせる
6. docs/architecture.md を直す: 処理の流れの図（重複排除→AI 分類の直列を、重複排除=URL のみ・ジャンル選別・限定的な Jev に）、構成要素の表（埋め込みの行を不採用に）、未決事項（重複判定・分類方式は決定済みとして消す。アーカイブ形式のみ残す）
7. 0011 から docs/jev-measurement.md を根拠として参照し、<!-- derived-from --> / supersedes の directive を CLAUDE.md の規約どおり付ける
8. pnpm run lint:md で検査し、AC を確認する
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ADR-0011 を追加し、ADR-0002 を置換。overview.md / architecture.md を方針に合わせた。lint:md 通過。

docs/architecture.md と docs/overview.md は同じ変更で更新済み。ADR-0003 の Vectorize は書き換えず、ADR-0011 の影響欄で無効と明記した。ジャンルを固定語彙にしない理由と、記事単位 > サイト単位の優先順位は ADR-0011 に記載。検証: lint / lint:md / format:check / typecheck / test がすべて終了コード 0、テスト 59 件通過。ドキュメントのみの変更のため「修正を戻すと落ちる」確認は対象外。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ADR-0011 を追加して ADR-0002 を置換した。選別の基本はフィード単位のジャンル（ユーザー定義の自由文字列、フィードに 1 つ）、重複排除は正規化 URL のみ、Jev は 4 つの限定対象だけ。記事単位の判定をサイト単位より優先し、ジャンル未設定のフィードは絞り込みの対象外とした。overview.md / architecture.md を新方針に合わせた。後続は TASK-17（ジャンルの実装）と TASK-21（Jev 基盤）。
<!-- SECTION:FINAL_SUMMARY:END -->
