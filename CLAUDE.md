
<!-- BACKLOG.MD GUIDELINES START -->
<!-- backlog.md-instructions-version: 1.53.0 -->
<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**At the beginning of each conversation in this project, run `backlog instructions overview` before answering or taking action. Re-read it only if you have not read it yet in the current conversation.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Before task lifecycle actions, read the matching detailed guide:

- `backlog instructions task-creation` before creating or splitting tasks
- `backlog instructions task-execution` before planning, changing status or assignee, adding a plan or implementation notes, or implementing task work
- `backlog instructions task-finalization` before checking acceptance criteria, writing final summaries, or moving tasks to terminal statuses

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>
<!-- BACKLOG.MD GUIDELINES END -->

## プロジェクト規約

Cloudflare Workers + TypeScript + D1 の RSS ツール。構成は [docs/architecture.md](docs/architecture.md)、決定は [docs/adr/](docs/adr/README.md)。

- 開発フロー・コミット・レビュー対応: [docs/dev/rules/workflow.md](docs/dev/rules/workflow.md)
- コメント規約: [docs/dev/rules/comments.md](docs/dev/rules/comments.md)

### Oxlint / Oxfmt（JS/TS）

- 設定は `.oxlintrc.json` と `.oxfmtrc.json` が単一の情報源。oxfmt は JS/TS だけを整形する（Markdown は対象外）
- カテゴリは correctness / suspicious / perf / pedantic を error にし、style と restriction は入れない
- **ルールを個別に無効化するときは、理由をコメントに書く**。理由の無い無効化は、後で「意図して外したのか」が区別できなくなる
- `pnpm run lint` は `oxlint --type-aware` で走らせる。Worker では await し忘れた D1 書き込みがリクエスト終了で黙って消えるため、`no-floating-promises` / `no-misused-promises` / `await-thenable` を error にしている。これは tsc でも型情報なしの lint でも検出できない

### D1 / マイグレーション

- スキーマの単一情報源は `schema/schema.sql`。Atlas が差分を `migrations/*.sql` に生成し、`wrangler d1 migrations apply` が適用する
- **適用済みのマイグレーションは編集しない。** 変更は新しいマイグレーションで行う。手で書いた後は `atlas migrate hash` で `atlas.sum` を更新する
- `wrangler d1 execute` で本番 D1 を直接叩かない

### 共通

- `git stash` は使わない。退避はスクラッチパッドへコピーする
- テスト結果は、終了コードを明示的に記録して判定する（パイプ越しに判定しない）
