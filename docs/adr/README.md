# ADR（設計上の決定記録）

- 命名: `NNNN-短い題名.md`（連番）
- 状態: 提案 / 採用 / 却下 / 置換（置換先を書く）
- 採用後の ADR は書き換えず、変更は新しい ADR で置換する

| # | 題名 | 状態 |
| --- | --- | --- |
| [0001](0001-cloudflare-typescript.md) | 実行基盤に Cloudflare と TypeScript を使う | 採用 |
| [0002](0002-ai-division.md) | AI の分担は Jev（判断）と Workers AI（埋め込み） | 採用 |
| [0003](0003-d1-r2-vectorize.md) | 保存先は D1 / R2 / Vectorize | 採用 |
| [0004](0004-hono-zod.md) | API は Hono、検証は Zod | 採用 |
| [0005](0005-cloudflare-access.md) | 認証は Cloudflare Access で自分のメールだけ許可する | 採用 |
| [0006](0006-htmx-hyperscript-sse.md) | フロントは htmx・hyperscript・SSE | 採用 |
| [0007](0007-node-pnpm-wrangler-dev.md) | ローカル開発は wrangler dev と Node、パッケージ管理は pnpm | 採用 |
| [0008](0008-src-layout.md) | src の構成は層別で、単体テストは本体の隣に置く | 採用 |

## テンプレート

[template.md](template.md) を複製して使う。
