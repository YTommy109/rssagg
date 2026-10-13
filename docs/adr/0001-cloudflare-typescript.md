# ADR-0001: 実行基盤に Cloudflare と TypeScript を使う

- 状態: 採用
- 日付: 2026-10-13

## 背景

定期クロール、記事保存、AI 処理を持つ Web ツールを作る。運用の手間を小さくしたい。

## 決定

Cloudflare 上で動かし、言語は TypeScript とする。

## 理由・検討した代替案

Workers、Cron Triggers、Workers AI などを同一基盤で使える。Workers は TypeScript が第一級で動く。他基盤との比較は行っていない。

## 影響

データベースは Cloudflare 内外を問わず未決。別 ADR で決める。
