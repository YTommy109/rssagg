# /merge — PR のマージと後片付け

現在のブランチの PR をマージし、`main` に切り替えて pull し、ローカルブランチを削除する。

手順:

1. `gh pr list --head <ブランチ名> --state open --json number,title` で、現在のブランチの open な PR を特定する。無ければ何もせず報告して終える
2. `gh pr checks <番号>` で CI を確認する。失敗中・実行中のチェックがあればマージせずに報告する（`deploy` の skipping は問題にしない）
3. `gh pr merge <番号> --merge` でマージする。squash と rebase は使わない（タスクごとのコミットを `main` に残すため。`docs/dev/rules/workflow.md`）
4. `gh pr view <番号> --json state,mergedAt` で `MERGED` になったことを確かめる
5. `git switch main` の後 `git pull` する
6. `git branch -d <ブランチ名>` でローカルブランチを削除する。`-D` は使わない（未マージの作業を消さないため）
7. マージした PR、pull で入った変更、削除したブランチを報告する
