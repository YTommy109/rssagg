---
name: create-migration
description: /create-migration <名前> — schema/schema.sql の変更から Atlas でマイグレーションを生成し、破壊的な文を確認する
disable-model-invocation: true
---

## create-migration

`schema/schema.sql` の変更を新しいマイグレーションにする。引数はマイグレーション名（例: `add_articles_url_unique`）。

### 手順

1. `schema/schema.sql` を編集済みか確認する。未編集なら先に編集する（単一の情報源はこのファイル）
2. 生成する: `pnpm run migrate:diff -- <名前>`
   - 差分が無いと何も生成されない。その場合は schema.sql の変更漏れを疑う
3. 生成された `migrations/*.sql` と `atlas.sum` を `git status` で確認する。生成されるのは新規 1 ファイルと `atlas.sum` の更新だけで、**既存のマイグレーションに差分が出たら中止してユーザーに知らせる**（適用済みは編集しない）
4. 生成された SQL を読み、破壊的な文を探す（コメント行を除く）:

   ```bash
   grep -vE '^[[:space:]]*--' migrations/<生成ファイル>.sql | grep -inE 'DROP[[:space:]]+(TABLE|COLUMN|INDEX)|RENAME[[:space:]]+(TO|COLUMN)|DELETE[[:space:]]+FROM|TRUNCATE'
   ```

   - Atlas はカラム型変更をテーブル再構築（作成 → コピー → DROP → RENAME）として出す。ヒットしたらデータが失われないかを説明してユーザーに確認する
   - CI のデプロイは未適用の破壊的変更で止まる（`scripts/check-destructive-migrations.sh`）。手動適用が要ることも伝える
5. ローカル D1 に適用して通ることを確認する: `pnpm run migrate:local`
6. `pnpm run check` を通す

### してはいけないこと

- 本番 D1 への `wrangler d1 execute` と `migrate:remote` の実行（適用は CI かユーザーが行う）
- 既存のマイグレーションの編集。手で書き直した場合は `atlas migrate hash --env local` で `atlas.sum` を更新する
