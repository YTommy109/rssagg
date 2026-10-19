---
id: TASK-5
title: 重複排除（URL正規化→本文ハッシュ）
status: Done
assignee:
  - '@claude'
created_date: '2026-10-13 13:10'
updated_date: '2026-10-19 01:04'
labels: []
dependencies:
  - TASK-4
  - TASK-13
priority: medium
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ADR-0002 の段階式のうち、前段の URL 正規化と本文ハッシュだけを扱う。記事一覧に複数のフィードの同じ記事が並ぶのを、実データで確かめながら減らす。埋め込み類似度と Jev の後段は TASK-18。Jev を使わないので TASK-9 には依存しない。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 同一記事が複数フィードから来ても 1 件になる
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
URL 正規化（fragment と utm_*/fbclid/gclid/mc_cid・mc_eid を除去）を取得時に url へ適用し、articles.url に UNIQUE を張る方式にした。専用カラムや状態は増やしていない。本文ハッシュは未実装: 本文は保存せず抜粋（先頭 300 字）しか無く、タイトルと抜粋が同じだけの別記事を誤って潰す恐れがあるため。必要性は実データで URL 正規化後の重複を見てから判断する。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
articles.url に UNIQUE インデックスを追加（マイグレーション 20261019010426）し、パース時に normalizeUrl で fragment と計測用クエリを落とす。INSERT は ON CONFLICT DO NOTHING で、別フィードが同じ記事を配信した場合は先に取得した方を残す。検証: 別フィード・計測パラメータ違いの URL が 1 件になる crawl テストを追加、vitest 59 件・lint・typecheck・format:check・lint:md が全て終了コード 0。リスク/残件: 本文ハッシュは未実装（理由は実装ノート）。既存データに url 重複があるとマイグレーションが失敗するが、本番未公開（TASK-15）のためローカル DB のみ影響。
<!-- SECTION:FINAL_SUMMARY:END -->
