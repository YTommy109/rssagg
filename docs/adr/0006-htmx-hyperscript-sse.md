# ADR-0006: フロントは htmx・hyperscript・SSE

- 状態: 採用
- 日付: 2026-10-13

## 背景

ADR-0004 で API と UI を Hono で作ると決めたが、UI の技術は未決だった。利用者は当面 1 人で、画面の主な仕事はフィード一覧と記事の閲覧、クロールや判定の進捗表示である。

## 決定

- 画面は Hono がサーバー側で HTML を返し、htmx で部分更新する。
- 画面内の小さな振る舞いは hyperscript で書く。
- クロールや判定の進捗などサーバーからの通知は、htmx の [SSE 拡張](https://htmx.org/extensions/sse/)で受け取る。

## 理由・検討した代替案

- SPA フレームワークはビルドと状態管理が増え、利用者 1 人の画面には重い。
- Workers 上の Hono で HTML を返す構成と相性が良く、フロント専用のビルド工程を持たずに済む。
- SSE はサーバーから一方向に流せれば足りるため、WebSocket より単純。Workers で長時間の接続を保てるかは未検証。

## 影響

- 画面の返却は JSON ではなく HTML 断片が中心になる。Zod による検証は入力と AI 出力に限る（ADR-0004 のまま）。
- 認証は ADR-0005 の Access が前段にあるため、htmx のリクエストにも同じ Cookie が付く。SSE の接続も Access 配下に置く。
- SSE の実現方法（Workers の接続時間制限、Durable Objects の要否）は着手時に検証する。
