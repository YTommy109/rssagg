---
id: TASK-29
title: フィード登録時に HTML ページからフィード URL を自動検出する
status: To Do
assignee: []
created_date: '2026-10-19 11:08'
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
- [ ] #1 フィード URL を直接登録すると、従来どおり登録され、初回の取得まで済む
- [ ] #2 <link rel=alternate> が 1 件だけある HTML ページの URL を登録すると、そのフィード URL で登録される
- [ ] #3 候補が複数ある HTML ページの URL を登録すると、title つきの候補が表示され、選んだ URL で登録できる
- [ ] #4 候補が 0 件の HTML ページ、および取得に失敗する URL は、理由つきで登録を断り、一覧に残らない
- [ ] #5 解決後の URL が登録済みなら 409 の理由が表示される
- [ ] #6 上記のテスト（フィード直接・候補 1・候補複数・候補 0・取得失敗・重複）があり、lint・型チェック・テストが通る
<!-- AC:END -->
