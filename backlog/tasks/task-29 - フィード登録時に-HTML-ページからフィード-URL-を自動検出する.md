---
id: TASK-29
title: フィード登録時に HTML ページからフィード URL を自動検出する
status: Done
assignee:
  - '@claude'
created_date: '2026-10-19 11:08'
updated_date: '2026-10-19 12:20'
labels: []
dependencies:
  - TASK-26
  - TASK-27
priority: medium
type: feature
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
HTML のページ URL（例: https://www.boriko.com/weblog/archives/55770）を登録すると、現状は初回取得で「RSS でも Atom でもない」になる。ページの <head> に <link rel="alternate"> でフィード URL が埋め込まれているので、登録時に取得して判定し、フィード URL に解決して登録する。

仕様:
- 登録時に 1 回取得し、Content-Type と本文の先頭でフィード（XML）か HTML かを判定する。フィードならそのまま登録して取得も済ませる。
- HTML なら HTMLRewriter（Workers 標準）で type が application/rss+xml または application/atom+xml の <link rel="alternate"> を抽出する。相対 URL はページ URL を基準に絶対化する。
- 候補が 1 件なら自動で登録する。複数なら title つきの候補リストをフォーム下に出し、利用者が選んだ URL で登録する（自動では選ばない。サイト全体・コメントなどがあり、推測が外れやすい）。
- 候補が 0 件なら「フィードが見つかりません」と明示して断る。/feed や /rss を推測して試す処理は入れない。
- 取得に失敗したとき（DNS 不達・HTTP エラー）は登録を断り、理由を見せる。誤った URL を一覧に残さないため。一時的な障害でも登録できなくなる点は許容する。
- 重複（409）は解決後のフィード URL で判定する。

依存: 登録時の取得は、利用者が任意の URL を入力できる取得の口になる。TASK-26（サイズ上限）と TASK-27（リダイレクト検査）を先に済ませる。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 フィード URL を直接登録すると、従来どおり登録され、初回の取得まで済む
- [x] #2 <link rel=alternate> が 1 件だけある HTML ページの URL を登録すると、そのフィード URL で登録される
- [x] #3 候補が複数ある HTML ページの URL を登録すると、title つきの候補が表示され、選んだ URL で登録できる
- [x] #4 候補が 0 件の HTML ページ、および取得に失敗する URL は、理由つきで登録を断り、一覧に残らない
- [x] #5 解決後の URL が登録済みなら 409 の理由が表示される
- [x] #6 上記のテスト（フィード直接・候補 1・候補複数・候補 0・取得失敗・重複）があり、lint・型チェック・テストが通る
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. crawl.ts: fetchFollowing/readLimited を土台に fetchBytes(url, headers) と saveFeed を切り出し、crawlFeed は挙動を変えず再構成
2. domain/feed-discover.ts: 本文が HTML か判定し、HTMLRewriter で link[rel=alternate] の RSS/Atom 候補(title つき・絶対化・feedUrlSchema 検査・重複除去)を抽出
3. feeds-page.tsx の POST のみ: 取得→フィードなら登録+保存、HTML は候補 0=422、1=その URL で再試行、複数=候補リスト(422)。取得失敗=502、重複=409(解決後 URL)。JSON API(/feeds)は対象外
4. views/feeds.tsx: 候補リストと、登録成功時に候補を消す処理
5. テスト: 直接・候補1・複数(選択して登録)・0・取得失敗・重複。既存ページテストは fetch をモックする
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
画面の登録(POST /settings/feeds)で URL を 1 回取得し、フィードなら登録して初回取得(タイトル・記事)まで済ませる。HTML なら HTMLRewriter で type が rss/atom の link[rel=alternate] を集め(相対は絶対化・feedUrlSchema 検査・重複除去)、1 件ならその URL で登録、複数なら title つき候補を #form-error に出して選ばせる(選択は同じ POST で再登録)、0 件は 422。取得失敗は 502 で登録しない。重複は解決後 URL で 409。crawl.ts は fetchBody/parseFetched/saveFeed に分け、crawlFeed の挙動は不変。JSON API(/feeds)は対象外。テスト: 直接・候補1・複数→選択・0・取得失敗・重複を追加。lint/format:check/typecheck/test(96件)すべて終了コード 0。
<!-- SECTION:FINAL_SUMMARY:END -->
