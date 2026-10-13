---
description: /finish-task — backlog タスクの検証・完了処理・コミットをまとめて行う
---

# /finish-task — タスクの完了処理

引数: `$ARGUMENTS`（対象タスク ID。例: `TASK-8`。省略時は In Progress のタスクを `backlog task list --status "In Progress" --plain` で確認し、1 件ならそれを対象にする。複数あるならユーザーに確認する）

実装が終わったタスクを、検証 → backlog の完了処理 → コミットの順で締める。手で並べると、lint を流し忘れる・受け入れ条件を証拠なしにチェックする、といった取りこぼしが起きる。

## 手順

### 1. 完了ガイドを読む

```bash
backlog instructions task-finalization
backlog task view $ARGUMENTS --plain
```

受け入れ条件ごとに「何を示せば満たしたと言えるか」を先に決める。実装方針が起票時と変わっているなら、`backlog task edit $ARGUMENTS --ac ...` で条件のほうを実態に合わせて書き換える（実装に合わせて条件を緩めるのではなく、採用した設計で何が保証されるかを書く）。

### 2. テストが空振りしていないか確かめる

新しく追加したテストについて、**修正を一時的に戻すと落ちる**ことを実測する。対象ファイルはスクラッチパッドへ退避し、確認後に必ず戻す（`git stash` は使わない）。落ちたテスト名と失敗メッセージを控える。

あわせて、このタスクで下した設計判断を棚卸しする。粒度・共有範囲・不変条件を決めたなら、それが破れたときに落ちるテストがあるか、破りようのない構造になっているか（コメントに書いただけになっていないか）を確かめる。

### 3. lint・整形・型・テスト

[`docs/dev/rules/workflow.md`](../../docs/dev/rules/workflow.md) の品質チェック手順に従う。終了コードを明示的に記録し、パイプ越しに判定しない。

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

マイグレーションを追加したタスクでは、あわせて `npm run migrate:lint` と `npm run migrate:local` を通す。

### 4. backlog を締める

```bash
backlog task edit $ARGUMENTS --append-notes "..."   # 採用した方針とその理由、実測値、検証結果
backlog task edit $ARGUMENTS --check-ac 1 --check-ac 2 ...
backlog task edit $ARGUMENTS --final-summary "..." -s Done
```

- Notes には「なぜその設計にしたか」「指摘どおりに直さなかったなら、その理由」「実測値（前後の数値・落ちたテスト名）」を残す
- 満たせなかった受け入れ条件は、チェックせずに理由を残す（黙って落とさない）

### 5. 現在の仕様へ反映する

構成要素・永続化スキーマ・処理の流れを変えたタスクでは、`docs/architecture.md` と `docs/overview.md` を同じ diff 内で更新する。更新不要と判断した場合は、その判断を Notes に 1 行残す（黙って飛ばすと「反映漏れ」と区別が付かない）。

他の選択肢を潰す判断を下したなら、`docs/adr/` に ADR を追加する。

### 6. コミット

`backlog/tasks/*.md` は git 管理対象なので、実装と同じコミットに含める。Conventional Commits + 日本語、本文にタスク ID を書く。

## 完了報告

次を必ず含める。

- 採用した方針と、当初案と違う形にしたならその理由
- 検証の証拠: テスト件数、lint / 型検査の結果、「修正を戻すと落ちる」ことの実測
- `docs/architecture.md` を更新したか（不要と判断したならその理由）
- コミットハッシュと、残っている関連タスク
