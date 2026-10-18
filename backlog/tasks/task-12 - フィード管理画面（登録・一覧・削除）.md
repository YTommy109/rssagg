---
id: TASK-12
title: フィード管理画面（登録・一覧・削除）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-18 13:13'
updated_date: '2026-10-18 14:00'
labels: []
dependencies:
  - TASK-11
  - TASK-3
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
フィードを登録できないと以降の機能に意味がない。TASK-3 の API を画面から使えるようにする。画面は HTML 断片を返す（ADR-0006）ので、既存の JSON API と別のルートにするか、同じルートで出し分けるかは着手時に決める。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 入力欄に URL を入れて登録すると、ページ全体を再読み込みせずに一覧へ追加される
- [x] #2 一覧の各行から削除でき、削除した行が画面から消える
- [x] #3 不正な URL や重複で登録できないとき、理由が画面に表示される
- [x] #4 wrangler dev で実際に登録・削除して確認している
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 検証（URL の正規化・http/https のみ・認証情報なし、id の厳密な検証）を src/domain/feed-input.ts に移し、既存の JSON API（/feeds）と画面で共有する
2. 画面は JSON API と別のルートにする。ADR-0006 のとおり画面は HTML 断片を返し、/feeds は JSON のまま残す。ページは /settings/feeds（GET）、登録は同じパスへの POST が行の断片を返す、削除は DELETE /settings/feeds/:id が空の 200 を返して行を消す
3. 登録の失敗（不正は 422、重複は 409）は HX-Retarget でフォーム下の #form-error へ入れる。htmx は既定で 4xx を差し替えないため、422 と 409 だけを差し替える設定を layout の htmx-config で足す。成功時は out-of-band で #form-error を空にする
4. 削除は hx-confirm で確認を挟む（記事も連鎖して消えるため）。/ の動作確認用の部品（ボタンと /ui/status）は、役目を終えるので消してフィード管理へのリンクに置き換える
5. test/feeds-page.spec.ts で、一覧の表示・登録（断片が返り DB に入る）・重複の 409・不正の 422・削除・JWT 無しの 401 を確認する
6. wrangler dev で起動し、Chrome で登録・削除・エラー表示を実際に操作して確認する
7. lint・format:check・lint:md・typecheck・test を終了コード付きで実行する
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
画面は JSON API（/feeds）とは別のルートにした（ADR-0006）。ページは /settings/feeds（GET）、登録は同じパスへの POST が行の断片を返し、削除は DELETE /settings/feeds/:id が空の 200 を返して行を消す。検証（URL の正規化・http/https のみ・認証情報なし、id の厳密な検証）は src/domain/feed-input.ts に移して API と画面で共有した。

失敗の理由は HX-Retarget でフォーム下の #form-error に入れる。htmx は既定で 4xx を差し替えないため、layout の htmx-config で 409 と 422 だけを差し替え、それ以外の 4xx/5xx は差し替えない。

ブラウザでの実操作で、自動テストでは見つからなかった不具合を 2 つ見つけて直した。(1) <style> の中身を JSX の子にすると引用符が &quot; にエスケープされ（生テキスト要素のため）、空の一覧の表示が黙って効かなかった。dangerouslySetInnerHTML で生のまま渡し、テストに出力の確認を足した。(2) 409/422 の応答を error なしで差し替えると htmx が successful とみなし、失敗なのに入力欄が消えた。error: true を足した。

検証: lint / format:check / lint:md / typecheck / test がすべて終了コード 0（test は 5 ファイル 44 件）。wrangler dev で起動し、Chrome で、登録（ページの再読み込みなし・入力欄が空に戻る）、表記違いの重複（409・理由の表示・入力が残る）、不正な URL（422・理由の表示）、成功後の理由の消去、削除（確認の文言・行が消える・再読み込みしても保たれる）を実際に操作して確認した。確認ダイアログはブラウザ操作が止まるため window.confirm を差し替えて通した（文言は記録して確認済み）。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
フィード管理画面（/settings/feeds）を作った。URL を入力して登録するとページを再読み込みせずに一覧へ行が追加され、各行から削除でき、不正な URL・重複は理由がフォーム下に表示される。
変更: src/routes/feeds-page.tsx（HTML 断片を返すルート）、src/views/feeds.tsx（行・ページ）、src/domain/feed-input.ts（API と画面で共有する検証）、src/views/layout.tsx（htmx の 409/422 差し替え設定・ナビ・空の一覧の表示）。TASK-11 の動作確認用の部品（ボタンと /ui/status）は役目を終えたので消し、/ はフィード管理へのリンクにした。test/feeds-page.spec.ts を追加した（7 件）。
失敗の扱い: 不正は 422、重複は 409。HX-Retarget で #form-error に理由を出し、入力欄は残す。成功時は行を足し、前回の理由を消し、入力欄を空に戻す。削除は hx-confirm で確認を挟む（記事も連鎖して消えるため）。
検証: lint / format:check / lint:md / typecheck / test がすべて終了コード 0（test は 44 件）。wrangler dev と Chrome で登録・重複・不正・削除を実際に操作して確認した。ブラウザの確認で、自動テストでは見つからなかった不具合 2 件（<style> の引用符のエスケープ、失敗時に入力欄が消える）を見つけて直した。
残る注意: フィードの実在確認（取得できるか、RSS/Atom か）は TASK-4 のクロールで行う。title は、クロールで取得するまで空のため URL を表示している。Access のセッション切れ時の htmx の挙動は TASK-15 で確認する。
<!-- SECTION:FINAL_SUMMARY:END -->
