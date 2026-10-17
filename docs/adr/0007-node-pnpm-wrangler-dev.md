# ADR-0007: ローカル開発は wrangler dev と Node、パッケージ管理は pnpm

- 状態: 採用
- 日付: 2026-10-17

## 背景

まずローカルで動かし、Cloudflare への deploy は動作がある程度そろってから行う。ローカルで JavaScript / TypeScript を動かす環境として、Node.js・Bun・Deno を比較した。

## 決定

- アプリはローカルでも `wrangler dev`（workerd と D1 のローカル版）で動かす
- テストは vitest と `@cloudflare/vitest-pool-workers` で、workerd 内で実行する
- ツールを動かす Node.js は 24 系を使う
- パッケージ管理は pnpm を使う
- Node・pnpm・Atlas の版は mise（`mise.toml`）でまとめて固定する
- タスクの入口は `package.json` の scripts（`pnpm run`）に 1 本化する。mise はツールの版の固定だけに使い、mise tasks は使わない

## 理由・検討した代替案

実行するコードは、ローカルでも本番でも workerd 上で動く。Node・Bun・Deno は、その周辺のツールを動かす側の選択にすぎない。

- **Bun / Deno**: 自分のランタイムで Worker を動かすと、D1・R2 などのバインディングが無く、本番の workerd と挙動が変わる。`wrangler` と `vitest-pool-workers` は Node 前提で作られており、載せ替えると公式の情報から外れる。採らない
- **npm**: 標準で追加の導入が要らないが、プロジェクトごとにパッケージ本体を重複して持つ
- **pnpm**: パッケージ本体をローカルの1か所のストアで共有し、プロジェクトをまたいだディスク使用量を抑えられる。複数プロジェクトを並行して扱うため、これを重視して採用する
- **タスクランナーを mise tasks にする案**: 採らない。文書・CI・hooks が `pnpm run` 前提で、CI に mise の導入も要る。JS 以外のツールを依存つきでつなぐ必要が出たら見直す
- **版の固定に `.node-version` を使う案**: 採らない。volta 経由の `pnpm` が、シェルの `node`（24）とは別の Node 18 で動き、wrangler と oxlint が起動しなかった。mise なら Node と pnpm を同じ設定で固定でき、この食い違いが起きない

## 影響

- 開発コマンドは `pnpm` で書く（`pnpm run dev` など）
- lockfile は `pnpm-lock.yaml` になる
- Vectorize はローカルで動かないため、ローカルではモックで代替する
