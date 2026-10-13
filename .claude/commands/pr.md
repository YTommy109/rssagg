# /pr — push & プルリクエスト作成

現在のブランチを push し、`gh pr create` でプルリクエストを作成する。既に PR がある場合は新規作成せず、その PR を更新する。

手順:

1. `gh pr list --head <ブランチ名> --state all --json number,state,mergedAt` で既存の PR を確認する。`--state all` を付けるのは、既定の open だけを見ると**マージ済みの PR を見落とす**ため
   - **open な PR がある場合**: 新規作成しない。push 後に `gh pr edit <番号> --body` で本文をブランチ全体の内容に更新する。タイトル・ラベルはブランチ全体の主眼が変わった場合のみ更新する
   - **マージ済み / クローズ済みの PR しかない場合**: そのブランチは用済み。`git fetch origin main` の後 `git log origin/main..HEAD --oneline` で、まだ main に入っていないコミットだけを確かめる。squash マージだと元のコミットは sha が変わって main に入るため、`git log` 上は「未マージ」に見える点に注意する。マージ済みの作業が残っていたら、ブランチを `origin/main` に載せ直してから起票する
   - **無い場合**: 以降の手順で新規作成する
2. `git log origin/main..HEAD --oneline` で PR に含まれるコミットを確認する。コミットが 0 件なら、未コミットの変更を先にコミットしてよいかユーザーに確認する
3. 未 push のコミットがあれば `git push -u origin <ブランチ名>` する
4. PR タイトルの Conventional Commits type（`feat` / `fix` / `chore` / `refactor` / `docs` / `test` / `ci` / `perf`）に対応するラベルを 1 つ選ぶ
5. `gh pr create --label <type> --assignee @me` で PR を作成し、URL を報告する

タイトル: ブランチの主要コミットに合わせた Conventional Commits 形式の日本語。複数コミットの場合は、先頭コミットの丸写しにせずブランチ全体の目的に合わせる。

本文は次の 3 節で構成する:

```markdown
## 概要

この PR で何がどう変わるかを 1〜3 文で書く。

## 変更内容

ファイル・機能ごとの箇条書き。なぜその変更が必要かも一言添える。

## 検証

実施した検証（テスト・手動確認）と、未検証で残る確認事項を書く。
```

注意:

- ベースブランチは `main`
- ラベルは PR タイトルの type と一致する 1 つのみ。複数 type にまたがる場合は、最も主要な変更の type を選ぶ
