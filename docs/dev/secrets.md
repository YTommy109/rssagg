# シークレットの扱い

<!-- derived-from ../adr/0009-workers-secrets.md -->

Jev の API キー（`JEV_API_KEY`）の置き場所と登録手順。方式を選んだ理由は [ADR-0009](../adr/0009-workers-secrets.md)。

## ローカル

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` の `JEV_API_KEY` を実値に書き換える。`.dev.vars` は gitignore 済みで、コミットされない。実値は `.dev.vars.example` や他のファイルに書かない。

## 本番

```bash
pnpm exec wrangler secret put JEV_API_KEY
```

プロンプトに値を貼り付ける。値はコマンドの引数やシェルの履歴に残らない。

- 登録済みの名前は `pnpm exec wrangler secret list` で確認できる。値は表示されない
- 更新も同じ `secret put` で、上書きされる
- 削除は `pnpm exec wrangler secret delete JEV_API_KEY`

## 型

`JEV_API_KEY` は `src/env.ts` の `AppEnv` で型を足している。`wrangler types` の生成物（`worker-configuration.d.ts`）には入らない。

## 空のとき

`JEV_API_KEY` が空（未登録）のときは、Jev の判定を飛ばして `console.warn` に残す（`src/jobs/judge.ts`）。記事の取り込みや画面の表示は止まらない。判定だけが無いまま進むので、本番で判定が付かないときは `wrangler secret list` で登録を確かめる。
