---
id: TASK-11
title: 画面の土台（レイアウトと htmx の配信）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-18 13:13'
updated_date: '2026-10-18 13:38'
labels: []
dependencies: []
priority: high
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
フィード登録 API はあるが画面が無く、動きをブラウザで確認できない。ADR-0006 の htmx・hyperscript を載せる最小の土台を作り、以降の画面タスクが乗れるようにする。htmx の配信方式（CDN か Workers の静的アセットか）はここで決める。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ブラウザで / を開くと、共通レイアウトのページが表示される（Access 検証の背後）
- [x] #2 htmx のリクエストで HTML 断片を差し替える動きを 1 つ、画面で確認できる
- [x] #3 htmx の配信方式を理由つきで ADR か docs に記録している
- [x] #4 wrangler dev で実際に表示して確認している
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. htmx の配信方式を決める: CDN（jsdelivr）からバージョン固定 + SRI で読み込む。tarball の整合性ハッシュと突き合わせ済み。理由つきで ADR-0010 に記録し、ADR 一覧に追記する
2. src/views/layout.tsx に共通レイアウトとページ描画の補助（doctype つき）を置く。htmx の URL と SRI はここに 1 か所で持つ
3. src/routes/home.tsx に / と htmx の動作確認用の断片 /ui/status を置き、src/index.ts でマウントする（Access 検証の背後）
4. test/home.spec.ts で、/ が HTML を返し固定した htmx を SRI つきで読み込むこと、断片が HTML 断片で返ること、JWT が無ければ 401 を確認する
5. wrangler dev で起動し、curl とブラウザで表示と htmx による差し替えを実際に確認する
6. lint・format:check・lint:md・typecheck・test を終了コード付きで実行する
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
wrangler dev で確認する過程で既存の不具合を見つけて直した。wrangler.jsonc に routes があると、wrangler dev がリクエスト URL のホスト名を本番のドメインに書き換え、ACCESS_BYPASS の迂回（宛先がローカルホストのときだけ効く）が一度も効いていなかった。dev.host を localhost にして解消した（--local-upstream の既定が dev.host のため）。

注意: .dev.vars があるマシンで pnpm cf-typegen を回すと、ACCESS_BYPASS と JEV_API_KEY が worker-configuration.d.ts に推論されて入る（マシンごとに差が出る）。コミットには入れない。ADR-0009 のとおり、型は src/env.ts で持つ。

検証: lint / format:check / lint:md / typecheck / test がすべて終了コード 0（test は 4 ファイル 33 件）。ブラウザ（Chrome）で http://localhost:8787/ を開き、SRI つきの CDN 経由で htmx が読み込まれること、ボタンでページを再読み込みせずに #status へサーバーの断片が入ることを確認した。

コードレビューの指摘を受けて修正: (1) ACCESS_BYPASS の迂回を両面でテストした（ローカルホスト宛ては通る・本番ホスト名宛ては true でも 401・true でなければ 401）。(2) dev.host を localhost:8787 にしてポートも保ち、Worker が見る URL をブラウザの URL と一致させた（実測: localhost だけだと http://localhost/... になる。指摘にあった https 化は起きなかった）。(3) home.spec.ts は定数の突き合わせをやめ、版が数字で固定されていること・SRI が sha384 の形であることを正規表現で見る。定数は非公開にした。(4) ADR-0010 の directive を constrained-by にした。

テストの入力データの不具合を見つけて直した: @cloudflare/vitest-plugin は開発者の .dev.vars も読み込む（Using secrets defined in .dev.vars）。ACCESS_BYPASS=true が入っていると、ローカルホスト宛てで 401 を期待するテストが通らなくなる。vitest.config.ts の miniflare.bindings で ACCESS_BYPASS と JEV_API_KEY を上書きして、.dev.vars の有無でテスト結果が変わらないようにした。

見送った指摘: 動作確認用の /ui/status とボタンは、受け入れ条件 2 が求めるものなので残す（TASK-12 で置き換える）。installAccessKeys の beforeEach/afterEach を共通化する案は、3 ファイルの複製にとどまるため見送る。Access セッション切れ時に htmx が無言になる件は、ローカルでは再現できないため TASK-15 に申し送る。検証: lint / format:check / lint:md / typecheck / test がすべて終了コード 0（test は 36 件）。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
画面の土台を作った。共通レイアウト（src/views/layout.tsx）と、/ と htmx の動作確認用の断片 /ui/status（src/routes/home.tsx）。どちらも Access 検証の背後にある。
htmx の配信方式は、jsDelivr からバージョンを固定（2.0.11）し、SRI と crossorigin を付けて読み込む方式にした。SRI は、npm の tarball（レジストリの整合性ハッシュで検証）と CDN のファイルが同一であることを確かめてから計算した。静的アセットで自前配信する案は、binding・run_worker_first・vitest 設定が増える割に得るものがオフライン動作だけなので採らなかった。理由は ADR-0010 に記録した。
副産物: wrangler.jsonc の routes が原因で、ローカルの ACCESS_BYPASS が一度も効いていなかった不具合を、dev.host の指定で直した。
検証: lint / format:check / lint:md / typecheck / test がすべて終了コード 0（test は 33 件）。wrangler dev で起動し、curl と Chrome で、表示・htmx の読み込み（SRI 検証つき）・ボタンによる断片の差し替え（再読み込みなし）を確認した。
残る注意: /ui/status と、/ のボタンは動作確認用の部品で、TASK-12 のフィード管理画面ができたら不要になる。hyperscript は必要になるまで読み込んでいない。CDN に届かない環境では、画面は出るが htmx の部分更新は動かない。
<!-- SECTION:FINAL_SUMMARY:END -->
