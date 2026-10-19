# ADR-0013: htmx と CSS は Worker に同梱して同一オリジンから配信する

- 状態: 採用
- 日付: 2026-10-19

<!-- supersedes ./0010-htmx-from-cdn.md -->
<!-- constrained-by ./0006-htmx-hyperscript-sse.md -->
<!-- constrained-by ./0012-lism-css.md -->

## 背景

[ADR-0010](0010-htmx-from-cdn.md) は htmx を CDN から読み込むと決め、自前配信を退けた。理由は、`assets` バインディング、Access を静的ファイルにも効かせる `run_worker_first`、vitest 側の設定が増えることだった。

[ADR-0012](0012-lism-css.md) で、自作の `.c--*` を含む CSS を自前で配信する経路が要ることになった。この経路があるなら、ADR-0010 が退けた費用は htmx と共有できる。

また、CDN だけが落ちると、アプリは動くのに画面だけが壊れる。htmx なら部分更新やフォーム送信が黙って効かなくなり、気づきにくい。

## 決定

- htmx は npm パッケージ（`htmx.org`）を `package.json` に入れ、版を固定して Worker に同梱する。
- htmx と、Lism・自作の CSS は、Worker の同一オリジンから配信する。`layout.tsx` の `<script>` と `<link>` はその URL を指す。
- CDN の URL と SRI は廃止する。完全性は `pnpm-lock.yaml` のハッシュが担保する。
- 具体的な同梱方法（wrangler の `rules` でテキストとして import するか、`assets` バインディングか）は、実装時に検証して選ぶ。フロント専用のビルド工程は持たない（ADR-0006）。

## 理由・検討した代替案

- 静的ファイルを取得できないことと、アプリを呼び出せないことが一致する。障害の形が 1 つに揃う。
- 配信経路は CSS で必要になるので、htmx の分の追加費用は小さい。
- SRI を CDN のファイルと tarball の同一性確認つきで手計算する工程が要らなくなる。
- **CDN のまま**: 採らない。上の障害の形の不一致が残る。

## 影響

- 同梱方法の検証が必要になる。Access は Worker の前段にあるので、静的ファイルにも効かせる設定を確かめる。
- htmx の版を上げるときは `package.json` を更新する。`layout.tsx` の URL と SRI の同時更新は不要になる。
- 初回の読み込みが Worker 経由になる。利用者は 1 人で、影響は無視できる。
- `layout.tsx` は ADR-0010 のままなので、この ADR に合わせた実装は別タスクで行う。
