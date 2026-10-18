---
id: TASK-9
title: Jev API キーの管理方針を決め、Workers Secrets で配線する
status: Done
assignee:
  - '@claude'
created_date: '2026-10-13 13:40'
updated_date: '2026-10-18 11:07'
labels: []
dependencies:
  - TASK-1
priority: high
type: task
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Jev（TypeSafe）の API キーを `.env` で持ちたくない。Cloudflare 側にシークレット管理機能があるため、置き場所を決めてから Jev 呼び出し（TASK-5 / TASK-6）に使う。候補は Workers Secrets（`wrangler secret put`、ローカルは `.dev.vars`）と Secrets Store（アカウント共通、binding 経由で `await env.X.get()`）。Worker 1 つなら Workers Secrets で足りるという見立て。Secrets Store は調査時点でベータだったため、採用するなら GA 状況を公式ドキュメントで再確認する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 採用方式（Workers Secrets か Secrets Store）が ADR または docs/architecture.md に理由つきで記録されている
- [x] #2 `.dev.vars` が `.gitignore` に入り、リポジトリに API キーの実値が含まれない
- [x] #3 `JEV_API_KEY` が Env の型に定義され、本番への登録手順（`wrangler secret put` など）が docs に書かれている
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Secrets Store の GA 状況を公式ドキュメントで確認する（2026-08-14 更新の概要ページは open beta、ベータ中は 1 アカウント 1 ストア）
2. 採用方式を Workers Secrets とし、ADR-0009 に理由つきで記録する（docs/adr/README.md の表も更新）
3. Env の型は src/env.ts で ACCESS_BYPASS と並べて足す（wrangler.jsonc の secrets.required は、wrangler dev が .dev.vars から宣言済みのキーしか読まなくなり ACCESS_BYPASS が消えるため使わない。getPlatformProxy で実測）
4. .dev.vars.example に JEV_API_KEY のダミー値を足す。.dev.vars が .gitignore 済みで、実値がリポジトリに無いことを確認する
5. 本番への登録手順を docs/dev/secrets.md に書き、docs/README.md と docs/architecture.md から辿れるようにする
6. lint・format:check・lint:md・typecheck・test を終了コード付きで実行して検証する
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
secrets.required で型を生成する案は不採用。getPlatformProxy で実測し、宣言ありでは .dev.vars の ACCESS_BYPASS が env から消えることを確認した（宣言なしでは入る）。ACCESS_BYPASS を宣言に足すと本番にも登録が要り、認証迂回フラグを本番に置くことになる。詳細は ADR-0009。

検証: lint / format:check / lint:md / typecheck / test がすべて終了コード 0（test は 2 ファイル 8 件）。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Jev の API キーは Workers Secrets に置く方式に決め、ADR-0009 に記録した。Secrets Store は公式ドキュメント（2026-08-14 更新）がまだ open beta で、ベータ中は 1 アカウント 1 ストアのため採らなかった。
変更: docs/adr/0009-workers-secrets.md（新規）と ADR 一覧、docs/dev/secrets.md（ローカルと本番の登録手順、新規）、docs/architecture.md と docs/README.md の導線、.dev.vars.example に JEV_API_KEY のダミー値、src/env.ts の AppEnv に JEV_API_KEY: string。
wrangler.jsonc の secrets.required は使わなかった。宣言すると wrangler dev が .dev.vars から宣言済みのキーしか読まなくなり、ACCESS_BYPASS が env から消えることを getPlatformProxy で実測したため。代わりに src/env.ts で型を足している。
検証: lint / format:check / lint:md / typecheck / test がすべて終了コード 0。.dev.vars は gitignore 済みで、リポジトリにはプレースホルダーしか無い。
残る注意: 本番への登録（wrangler secret put JEV_API_KEY）は未実施で、値が必要なため人が行う。未登録でもデプロイ時には検知されない。TASK-5・TASK-6 で Jev を呼ぶ前に登録すること。
<!-- SECTION:FINAL_SUMMARY:END -->
