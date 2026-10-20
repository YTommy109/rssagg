---
id: TASK-30
title: 画面デザインを feedly 風にする
status: To Do
assignee: []
created_date: '2026-10-20 11:44'
updated_date: '2026-10-20 11:46'
labels: []
dependencies: []
priority: low
type: feature
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
記事一覧を feedly のような見た目に寄せる。左にサイドバー（今日・後で読む・フィード/ジャンルの一覧）、右に記事をカードで並べるレイアウト。配色は OS のダーク/ライト設定に合わせる（prefers-color-scheme）。スタイルは ADR-0012（Lism CSS 準拠）に従い、実装時は lism-css-guide スキルを参照する。機能は変えず、見た目だけを変える。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 左にサイドバーがあり、記事一覧・後で読む・設定（フィード）へ移動できる
- [ ] #2 ジャンル（フィルタ）がサイドバーから選べ、現在選択中のものが分かる
- [ ] #3 記事がカード（サムネイル・タイトル・フィード名・経過時間・抜粋）で並ぶ。サムネイルが無い記事も崩れない
- [ ] #4 既存の操作（後で読む・判定する・絞り込み）が htmx のまま従来どおり動き、既存テストが通る
- [ ] #5 狭い画面ではサイドバーが折りたたまれ、1 列で読める
- [ ] #6 配色は OS のダーク/ライト設定に追従し、両方で読める（色はデザイントークンで定義し、直書きしない）
<!-- AC:END -->
