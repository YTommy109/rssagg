---
id: TASK-10
title: vitest の非推奨 API と改名したパッケージへ移行する
status: Done
assignee:
  - '@claude'
created_date: '2026-10-17 12:08'
updated_date: '2026-10-17 13:39'
labels: []
dependencies: []
priority: low
type: chore
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`pnpm test` のたびに、@cloudflare/vitest-pool-workers が @cloudflare/vitest-plugin に改名されたという警告が出る。あわせて、cloudflare:test の env と SELF は非推奨で、cloudflare:workers の env と exports.default.fetch に置き換える方針が型定義（@deprecated）に書かれている。今はテストが通るため放置しているが、テストが増えるほど非推奨の書き方が広がって移行量が増える。TASK-3 以降でテストを書き足す前に済ませたい。新しいテスト（test/schema.spec.ts）はすでに cloudflare:workers の env を使っている。残りは test/setup.ts の env と test/access.spec.ts の SELF。SELF は置き換え後に挙動が変わらないかを確かめる必要がある。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `pnpm test` の出力に、パッケージ改名と cloudflare:test の非推奨の警告が出ない
- [x] #2 lint・lint:md・format:check・typecheck・test がすべて終了コード 0 で通る
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
検証: pnpm test の出力に warn / renamed / deprecat が 0 件（移行前は改名警告 1 件）。lint・lint:md・format:check・typecheck・test がすべて終了コード 0（テスト 8 件）。typescript/no-deprecated を error に戻し、非推奨の SELF を使うプローブで no-deprecated が検出することを確認（プローブは削除）。コードモッドは使わず手で移行（第三者コードの実行と複数ファイルの一括書き換えを避けた）。pnpm-lock.yaml が約 720 行減ったのは、旧パッケージが抱えていた私有の wrangler 4.124.0 / miniflare / workerd 1.20260815.1 が消えたため。トップレベルの wrangler は 4.151.1 のまま。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
@cloudflare/vitest-pool-workers を @cloudflare/vitest-plugin 1.4.4 に移行した（package.json・vitest.config.ts・tsconfig の types）。cloudflare:test の env を cloudflare:workers の env に、SELF.fetch を exports.default.fetch に置き換え、効いていない singleWorker オプションを削除した。.oxlintrc.json で「代替が無い」として外していた typescript/no-deprecated は、代替（cloudflare:workers）があると分かったため error に戻した。これで今回のような非推奨の使用は lint が検出する。ADR-0007/0008 と ci.yml のコメントに残っていた旧パッケージ名も更新した。フォローアップ: なし。
<!-- SECTION:FINAL_SUMMARY:END -->
