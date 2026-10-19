# 開発ワークフロー規約

コマンド・コミット・品質チェック・レビュー対応・応答言語の規約。behold の規約から、言語に依存しない部分だけを移植した。

## コマンド

`package.json` の scripts は TASK-1 で定義する。

```bash
pnpm run dev            # wrangler dev
pnpm test               # vitest run
pnpm run typecheck      # tsc --noEmit
pnpm run lint           # oxlint --type-aware --report-unused-disable-directives
pnpm run format:check   # oxfmt --check
pnpm run migrate:diff -- <name>   # atlas migrate diff（schema/schema.sql から SQL を生成）
pnpm run migrate:local            # wrangler d1 migrations apply --local
```

## コミット規約

Conventional Commits + 日本語:

```text
<type>: <変更内容を動詞で始める日本語>

[body: 必要な場合のみ]
```

type は `feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `ci`。

## マージ方針

PR は**通常の merge（マージコミット）**で取り込む。squash merge と rebase merge は使わない。

- squash と rebase はコミットのハッシュが変わる。ブランチ側のコミットが `main` の祖先でなくなり、`git branch --merged` や `git log main..<ブランチ>` が「未マージ」と誤判定する
- タスクごとに分けたコミットの単位を、そのまま `main` に残す

マージ済みかどうかを git の履歴で判定できないとき（誤って squash した場合など）は、`gh pr view <番号> --json state,mergedAt` で GitHub に確認する。

GitHub のリポジトリ設定では "Allow squash merging" と "Allow rebase merging" を外し、"Automatically delete head branches" を有効にする。

## 品質チェック手順

次の順に実行する。軽く落ちるものを先に置く。

1. `pnpm run lint`
2. `pnpm run format:check`
3. `pnpm run lint:md`
4. `pnpm run typecheck`
5. `pnpm test`

- `.md` の保存時 lint はフックで走るが、Edit/Write ツール経由に限る。Bash の heredoc や `sed` で書いた `.md` は対象外なので、PR の前に `pnpm run lint:md` を必ず回す
- **テスト結果をパイプ越しに判定しない。** `pnpm test | tail -80` の終了コードは `tail` のもので、テストが落ちていても 0 になる。`set -o pipefail` を有効にするか、`pnpm test > log 2>&1; echo $?` のように終了コードを明示的に記録し、あわせて要約行も確認する
- 要約行だけを目視する運用は、出力が途中で切れていると見落とす。終了コードと要約行の両方を根拠にする

## コミット時のフック（lefthook）

`lefthook.yml` の pre-commit が、**ステージ済みファイルだけ**に次を並列で回す。

- TS/JS: `oxlint --type-aware` と `oxfmt --check`
- Markdown: `markdownlint-cli2`
- `dagayn update` と `dagayn detect-changes`（dagayn があるときだけ）

導入は `pnpm install` の `prepare` スクリプト（`lefthook install`）が行う。clone 直後に手動手順は要らない。

- **型チェックとテストは pre-commit に置かない。** 遅く、コミットのたびに待たされると `--no-verify` が常用される。pre-push にも置かず、CI と手元の `pnpm run check` に任せる
- **CI との役割分担。** フックは手元で最も早く落とすための関門で、迂回できる（`--no-verify`）。CI は迂回できない最終関門で、全ファイルの lint・format・型・テストを回す。フックが通ったことは CI の合格を意味しない
- **dagayn との共存。** `lefthook install` は既存の `.git/hooks/pre-commit` を `pre-commit.old` に退避して置き換え、`.old` は実行しない。dagayn の pre-commit 相当は `lefthook.yml` の `dagayn` ジョブに移してある。post-commit は lefthook が管理しないので、dagayn のものがそのまま動く。`dagayn` がフックを再インストールして pre-commit を上書きしたら、`pnpm run prepare` で戻す

## レビュー対応方針

- レビュー・自己チェックで指摘された内容は、同じタスク内で解消する。「次に触るときに」と先送りしない
- 「対応必須ではない」「任意」「現状維持でよい」は、実際に代替実装を試して比較した後にのみ許される結論である。試さずに見送りを判断してはならない
- レビュー対象は差分の追加行に限らない。編集したファイル内の既存コードに規約違反が同居していたら、同じタスク内で是正する
- レビュー担当は、深刻度が低い指摘でも「対応不要」の一言で済ませず、具体的な代替コードを示す

## 提案は前提と根拠を示す

設計や方針を提案するときは、検証可能な前提に根拠（実測値、`path` と識別子によるコード参照、ドキュメント参照）を添える。検証していない前提は、未検証と明記する。

## 応答言語

- 会話、コード外の説明、コミットメッセージは日本語
- 変数名・関数名・ファイル名は英語
- ユーザーが英語で質問した場合は、返答も英語
