---
id: TASK-33
title: 定期実行での判定を scheduled() に組み替え、時間予算を設ける
status: To Do
assignee: []
created_date: '2026-10-20 13:27'
labels: []
dependencies: []
references:
  - src/jobs/crawl.ts
  - src/jobs/judge.ts
  - src/index.ts
  - src/routes/feeds-page.tsx
priority: medium
type: task
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
記事ごとの判定は `crawlAll` の省略可能な第 3 引数として組み込まれており、クロールの直後に直列で走る。これにより次の問題がある。

- 全体の時間予算が無い。`askJev` のタイムアウトは 30 秒で、Jev が応答しないと 20 件で 10 分かかる。429/529 の遅いリトライ（最大 4 回 × 30 秒 + バックオフ）が重なると Workers の scheduled ハンドラの上限 15 分を超えて途中で kill され、console.error も失われる。
- `crawlAll` の全呼び出し元（テスト含む）が黙って `listUnjudgedArticles` を実行するようになった。一方、手動の「今すぐ取得」（`crawlFeed`）は判定しないため、route のコメント「定期クロールと同じ取得処理」と食い違う。手動取得後に判定するかどうかは未決定で、本タスクで決める。
- `judgePending` は apiKey/ジャンルの確認より先に未判定記事を取り、`listGenres` を直列に await し、さらに NOT EXISTS で絞った記事に `isJudged` を 1 件ずつ再確認している。JEV_API_KEY 未設定でも毎時 join クエリが走る。

クロールと判定の合成は `src/index.ts` の scheduled() 側で行い、クロールはクロールのままにする構成が妥当と見られるが、方針は着手時に確認する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `crawlAll` は判定を行わず、クロールと判定の合成は scheduled 側で行われている
- [ ] #2 1 回の定期実行で判定に使う時間に上限があり、Jev が応答しない状態でも scheduled ハンドラが Workers の上限内に終わる
- [ ] #3 JEV_API_KEY が未設定の定期実行では、未判定記事のクエリが発行されない
- [ ] #4 1 回の判定で発行される D1 クエリが、記事一覧とジャンル一覧の取得に限られ、記事ごとの判定済み再確認をしない
- [ ] #5 手動の「今すぐ取得」で判定するかどうかが決まっていて、route のコメントと実装が一致している
- [ ] #6 時間予算で打ち切った場合に、打ち切ったことがログに残る
<!-- AC:END -->
