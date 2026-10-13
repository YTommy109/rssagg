# ADR-0005: 認証は Cloudflare Access で自分のメールだけ許可する

- 状態: 採用
- 日付: 2026-10-13

## 背景

利用者は当面 1 人だが、複数のマシンから使うため Cloudflare 上に公開する。公開する以上、自分以外を締め出す仕組みが要る。

## 決定

- Cloudflare Access のアプリケーションをカスタムドメインに設定し、Allow ポリシーは自分のメールアドレスのみとする。
- ログイン方法は One-time PIN から始め、必要になれば Google などの IdP を足す。
- Worker の `workers_dev` と Preview URL は無効にする。
- Worker 側でも `Cf-Access-Jwt-Assertion` の署名と `aud` を検証する。
- ブラウザ以外のクライアントが必要になったら Service Token を使う。

## 理由・検討した代替案

- アプリ内にログイン機能を作る案は、利用者 1 人に対して実装と保守が重い。
- Access は指定したホスト名しか守らない。`workers.dev` を開けたままにすると素通りになるため無効にする。
- Access の設定ミスに備え、Worker でも JWT を検証して二重にする。

## 影響

- TASK-1 の雛形に `workers_dev: false`、`preview_urls: false`、JWT 検証ミドルウェアを含める。
- ローカルの `wrangler dev` では JWT が付かないため、検証は開発時のみ迂回できるようにする。
