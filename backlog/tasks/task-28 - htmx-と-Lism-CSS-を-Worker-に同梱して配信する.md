---
id: TASK-28
title: htmx と Lism CSS を Worker に同梱して配信する
status: Done
assignee:
  - '@claude'
created_date: '2026-10-19 07:41'
updated_date: '2026-10-19 07:55'
labels: []
dependencies: []
priority: medium
type: task
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ADR-0012・ADR-0013 に沿って、htmx と CSS（Lism CSS + 自作 .c--*）を npm 依存として Worker に同梱し、同一オリジンから配信する。layout.tsx の CDN 読み込みと SRI は廃止する。同梱方法（wrangler の rules でテキスト import、または assets バインディング）は実装時に検証して選び、結果を ADR に反映する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 htmx.org と lism-css が package.json に版固定で入り、Worker の同一オリジンから配信される
- [x] #2 layout.tsx の CDN の URL と SRI が無くなり、htmx の部分更新が動く
- [x] #3 Access の前段を静的ファイルも通ることを確認している
- [x] #4 vitest でも同梱した資産の配信をテストしている
- [x] #5 feeds.tsx 1 画面に Lism のクラスを当て、CSS の読み込みを目視で確認している
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
htmx.org@2.0.11 と lism-css@1.0.1 を版固定で依存に追加し、wrangler の rules（Text）で取り込んで /static/htmx.js・/static/lism.css を Hono ルートから配信。layout.tsx の CDN 読み込みと SRI は廃止。ルートは accessMiddleware 配下なので Access が効く。feeds.tsx に l--stack/l--flex を当て、wrangler dev + ブラウザで htmx 読込・Lism 適用（flex/gap/column）を確認。vitest で配信・401・同一オリジン参照をテスト。ADR-0012/0013 に確定事項（glob は import 指定子と照合、vitest は解決後パス、レイヤー名 lism-custom）を追記。型・lint・format・md・テスト 74 件すべて通過。
<!-- SECTION:FINAL_SUMMARY:END -->
