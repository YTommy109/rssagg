# ADR-0009: Jev の API キーは Workers Secrets に置く

- 状態: 採用
- 日付: 2026-10-18

<!-- derived-from ./0002-ai-division.md -->

## 背景

判断（分類・除外・重複確認）に Jev を使う（[ADR-0002](0002-ai-division.md)）。Jev の API キーは `.env` のようなリポジトリ内のファイルに置きたくない。Cloudflare には、Worker ごとの Workers Secrets と、アカウント共通の Secrets Store がある。

## 決定

- API キーは Workers Secrets に置く。名前は `JEV_API_KEY` とする。
- 本番へは `wrangler secret put JEV_API_KEY` で登録する（手順は [docs/dev/secrets.md](../dev/secrets.md)）。
- ローカルは `.dev.vars` に書く。`.dev.vars` は gitignore 済みで、雛形は `.dev.vars.example` に置く。
- Env の型は `src/env.ts` で `ACCESS_BYPASS` と並べて足す。`wrangler.jsonc` の `secrets.required` は使わない。

## 理由・検討した代替案

- **Secrets Store**: 採らない。公式ドキュメント（2026-08-14 更新）は今も open beta としており、ベータ中は 1 アカウントに 1 ストアしか作れない。Worker が 1 つで共有する相手もいないため、アカウント共通にする利点が無い。他のシークレットを Worker をまたいで共有する必要が出たら見直す。
- **`secrets.required` で宣言する案**: 採らない。宣言すると型が生成され、未登録のままのデプロイも失敗にできる。しかし `wrangler dev` が `.dev.vars` から宣言済みのキーしか読まなくなる。`getPlatformProxy` で実測すると、宣言ありでは `ACCESS_BYPASS` が `env` から消え、宣言なしでは入った。`ACCESS_BYPASS` を宣言に足すと本番にも登録が要り、認証を迂回するフラグを本番に置くことになるため採れない。
- **`vars` に書く案**: 採らない。値が `wrangler.jsonc` に入り、リポジトリに載る。

## 影響

- 本番へ登録するまで、Jev を呼ぶコード（TASK-5・TASK-6）は本番で動かない。デプロイ時に未登録は検知されない。
- `JEV_API_KEY` は `src/env.ts` で必須の `string` として型付けする。未設定でも型は通るため、呼び出し側が空値を扱う必要がある。
