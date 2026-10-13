# 開発ワークフロー規約

コマンド・コミット・品質チェック・レビュー対応・応答言語の規約。behold の規約から、言語に依存しない部分だけを移植した。

## コマンド

`package.json` の scripts は TASK-1 で定義する。

```bash
npm run dev            # wrangler dev
npm test               # vitest run
npm run typecheck      # tsc --noEmit
npm run lint           # oxlint --type-aware --report-unused-disable-directives
npm run format:check   # oxfmt --check
npm run migrate:diff -- <name>   # atlas migrate diff（schema/schema.sql から SQL を生成）
npm run migrate:local            # wrangler d1 migrations apply --local
```

## コミット規約

Conventional Commits + 日本語:

```text
<type>: <変更内容を動詞で始める日本語>

[body: 必要な場合のみ]
```

type は `feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `ci`。

## 品質チェック手順

次の順に実行する。軽く落ちるものを先に置く。

1. `npm run lint`
2. `npm run format:check`
3. `npm run typecheck`
4. `npm test`

- **テスト結果をパイプ越しに判定しない。** `npm test | tail -80` の終了コードは `tail` のもので、テストが落ちていても 0 になる。`set -o pipefail` を有効にするか、`npm test > log 2>&1; echo $?` のように終了コードを明示的に記録し、あわせて要約行も確認する
- 要約行だけを目視する運用は、出力が途中で切れていると見落とす。終了コードと要約行の両方を根拠にする

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
