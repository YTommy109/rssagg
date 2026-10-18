---
id: TASK-3
title: フィード登録 API
status: Done
assignee:
  - '@claude'
created_date: '2026-10-13 13:10'
updated_date: '2026-10-18 13:04'
labels: []
dependencies: []
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
RSS/Atom URL の登録・一覧・削除。Zod で検証。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 URL 登録後に一覧で取得できる
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. src/db/feeds.ts に D1 クエリを置く（登録は ON CONFLICT (url) DO NOTHING RETURNING で重複を判別、一覧、削除）
2. src/routes/feeds.ts に POST /feeds・GET /feeds・DELETE /feeds/:id を置く。入力は Zod で検証する（url は http/https のみ、id は正の整数）。重複は 409、不正は 400、無ければ 404
3. src/index.ts で /feeds をマウントする（Access 検証の背後）
4. test/feeds.spec.ts で Access JWT を通して、登録後に一覧で取得できること・重複・不正入力・削除・未認証を確認する
5. lint・format:check・lint:md・typecheck・test を終了コード付きで実行する
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
重複の判別は例外の文言に頼らず、INSERT ... ON CONFLICT (url) DO NOTHING RETURNING の戻り行の有無で決めた。URL の正規化（末尾スラッシュなど）は行っていない。記事の重複排除は TASK-5 の範囲。

検証: lint / format:check / typecheck / test がすべて終了コード 0（test は 3 ファイル 20 件、うち test/feeds.spec.ts が 12 件）。

コードレビューの指摘を受けて修正: (1) id を /^[1-9]\d{0,14}$/ で厳密にした（z.coerce.number は 1e3・0x10 を通し、別のフィードを消しかねなかった）、(2) 登録前に URL を正規化した（ホスト名の大文字小文字・既定ポート・フラグメント。パスの末尾スラッシュは意味が変わり得るので触らない）、(3) 認証情報つき URL を拒否した、(4) 壊れた JSON は invalid_url ではなく invalid_body にした。検証: lint / format:check / typecheck / test が終了コード 0（test は 30 件）。

TASK-4 への申し送り: 登録時にホスト名で内部アドレス宛（localhost・プライベート IP など）を弾くことはしていない。DNS 経由で解決される名前は登録時には防げないため、クロールで fetch する側で扱う。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
フィードの登録・一覧・削除の API を追加した（POST /feeds、GET /feeds、DELETE /feeds/:id）。Access 検証の背後に置いている。
変更: src/db/feeds.ts（D1 クエリ）、src/routes/feeds.ts（Zod による検証と HTTP）、src/index.ts（マウント）、test/feeds.spec.ts（Access JWT を通した 22 件）。
入力検証: url は前後の空白を除き、http/https のみ・2048 文字以内・認証情報なし。保存前に正規化する（ホスト名の大文字小文字・既定ポート・フラグメント）。パスの末尾スラッシュは別の URL として扱う。不正な URL は 400（invalid_url）、壊れた JSON は 400（invalid_body）、重複は 409、存在しない id の削除は 404、id が正の整数の表記でなければ 400。
検証: lint / format:check / typecheck / test がすべて終了コード 0（test は 30 件）。受け入れ条件の「URL 登録後に一覧で取得できる」は test/feeds.spec.ts の最初のテストで確認した。
残る注意: 内部アドレス宛の URL は登録時に弾いていないため、TASK-4 のクロール側で扱う。フィードの実在確認（取得できるか、RSS/Atom か）も TASK-4。wrangler dev で起動しての確認はしていない。
<!-- SECTION:FINAL_SUMMARY:END -->
