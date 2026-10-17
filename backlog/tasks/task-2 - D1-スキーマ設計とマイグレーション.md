---
id: TASK-2
title: D1 スキーマ設計とマイグレーション
status: Done
assignee:
  - '@claude'
created_date: '2026-10-13 13:10'
updated_date: '2026-10-17 12:05'
labels: []
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
feeds / articles / judgments / saved の最小スキーマ。本文は持たず要約・抜粋のみ。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 マイグレーションが適用できる
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. schema/schema.sql に feeds / articles / judgments / saved の最小スキーマを書く（ADR-0003: 本文は持たず要約・抜粋のみ、既読・保存状態は D1）。時刻は epoch 秒の INTEGER、外部キーは ON DELETE CASCADE
2. pnpm run migrate:diff -- initial で migrations/ を生成し、atlas.sum を更新
3. pnpm run migrate:local でローカル D1 に適用。test/schema.spec.ts でテーブルの存在・一意制約・外部キーの連鎖削除を確認（test/setup.ts が migrations/ を適用する）
4. lint/lint:md/format:check/typecheck/test を通す。dedupe 用の列や topic 方式などは TASK-5/6 が決めるため、ここには入れない
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
検証: atlas migrate validate 0。pnpm run migrate:local（wrangler d1 migrations apply DB --local）が終了コード 0・8 コマンド成功、再適用は No migrations to apply。wrangler d1 execute --local で articles / feeds / judgments / saved を確認。test/schema.spec.ts 4 件（テーブル存在・(feed_id, guid) 一意・score の CHECK・feeds 削除での連鎖削除）が test/setup.ts 経由の migrations 適用後に通過。lint / lint:md / format:check / typecheck / test すべて 0（8 件通過）。本番 D1 への適用は未実施（main へのマージ後の deploy ジョブで migrate:remote が適用する）。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
schema/schema.sql に feeds / articles / judgments / saved の最小スキーマを定義し、Atlas で migrations/20261017120421_initial.sql を生成した。時刻は epoch 秒の INTEGER、外部キーは ON DELETE CASCADE。articles は (feed_id, guid) 一意で本文を持たず excerpt / summary のみ、既読は articles.read_at（ADR-0003）。judgments は (article_id, topic) ごとの確率 score（0〜1 の CHECK）で、topic は分類方式が未決のため自由文字列。saved は article_id 主キーで archive_key は NULL 可（アーカイブ形式が未決）。重複排除用の列（正規化 URL・ハッシュ）や埋め込みの参照は、判定方式が未決のため含めていない（必要になった時点で新しいマイグレーションで追加）。フォローアップ: 本番 D1 への初回適用は main へのマージ後の deploy で行われる。
<!-- SECTION:FINAL_SUMMARY:END -->
