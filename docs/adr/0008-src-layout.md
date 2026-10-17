# ADR-0008: src の構成は層別で、単体テストは本体の隣に置く

- 状態: 採用
- 日付: 2026-10-17

## 背景

TASK-1 でコードを置き始める前に、ディレクトリ構成と依存の向きを決めておく。lint の上限（1 ファイル 200 行、1 関数 50 行、complexity 10）が厳しいため、責務の線引きを先に決めないと分割で迷う。

## 決定

### ディレクトリ

```text
src/
  index.ts        Worker のエントリ。fetch（Hono）と scheduled（cron）の入口だけ
  env.ts          Env の型（D1・R2・Vectorize・Secrets のバインディング）
  middleware/     Access JWT 検証など
  routes/         HTTP。検証 → 処理の呼び出し → 描画だけ。薄く保つ
  views/          hono/jsx のテンプレート（htmx 用の断片を含む）
  jobs/           cron から呼ぶクロール処理
  domain/         純粋ロジック。URL 正規化、ハッシュ、フィードのパース、重複判定
  db/             D1 クエリ。SQL を書くのはここだけ
  ai/             Jev・Workers AI・Vectorize の呼び出し
test/             複数モジュールをまたぐテスト
```

### 依存の向き

- `routes` と `jobs` は、`domain`・`db`・`ai` を呼べる
- `db` と `ai` は、`domain` の型だけを参照できる
- `domain` は何にも依存しない（D1 も fetch も使わない）

### テスト

- 1 つのモジュールを対象にするテストは、本体の隣に `*.spec.ts` として置く（D1 を使っても、対象が 1 つなら隣に置く）
- 複数のモジュールをまたぐテスト（ルートから D1 まで通す、クロール全体、Access の JWT 検証を通した流れ）は `test/` に置く
- テストは `it` で書く。`test` と混在させない（lint で強制する）

## 理由・検討した代替案

- 重複排除の判定は、中身の大半が純粋な計算になる。`domain` に集めれば workerd を立てずにテストできる
- 「SQL は `db` だけ」「AI 呼び出しは `ai` だけ」と決めておけば、lint の上限に当たったときの分割先が明確になる
- 本体とテストを並べると、見比べる手間が減る。wrangler はエントリから import をたどったファイルだけをバンドルするため、どこからも import されない `*.spec.ts` は成果物に入らない
- repository や service の interface は、実装が 1 つしかないので置かない。`db/` の関数を直接呼ぶ
- 機能別のフォルダは採らない。機能が 3〜4 つの間は層別のほうが探しやすい。層の中が上限に何度も当たるようになったら切り替える

## 影響

- `.oxlintrc.json` のテスト用 override を `**/*.spec.ts` と `test/**` に広げ、`vitest/consistent-test-it` で `it` を強制する
- vitest の `include` は `src/**/*.spec.ts` と `test/**/*.spec.ts` にする（vitest 基盤は TASK-8 で用意する）
- tsconfig の `types` に `@cloudflare/vitest-pool-workers/types` があるため、`src/` の本体コードにもテスト用の型が見える。本体がテスト用 API を誤って import しても tsc では気付けない。問題になったら、本体用とテスト用の tsconfig に分ける
- 依存の向きの機械的な強制（`no-restricted-imports` の override など）は、oxlint で書けるかを確認してから別途決める
