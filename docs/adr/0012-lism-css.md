# ADR-0012: CSS の設計は Lism CSS に準拠する

- 状態: 採用
- 日付: 2026-10-19

<!-- constrained-by ./0006-htmx-hyperscript-sse.md -->
<!-- constrained-by ./0010-htmx-from-cdn.md -->

## 背景

画面のスタイルはほぼ未着手で、CSS の規律が決まっていない。AI にスタイルを書かせると、同じ見た目が別名で複製されたり、`@media` が場当たりに増えたりする。画面を増やす前に、設計の拠り所を決める。

制約は次のとおり。

- フロント専用のビルド工程を持たない（[ADR-0006](0006-htmx-hyperscript-sse.md)）
- htmx は CDN から読み込んでいた（[ADR-0010](0010-htmx-from-cdn.md)）。CSS も同じ形にするか、同梱するかを決める必要がある
- 自作の `.c--*` は自前で配信するので、CSS の配信経路はどのみち Worker に要る
- 画面は Hono JSX で組み立て、htmx が HTML 断片を差し替える

## 決定

- CSS の設計は [Lism CSS](https://lism-css.com/) に準拠する。
  - レイアウトは Primitive クラス（`l--stack` など）、余白・色・文字サイズはデザイントークン、単一プロパティの指定は Property Class（`-p:20` など）を使う。
  - Lism に無いスタイルは `.c--{name}` クラスを `@layer lism-component` 内に標準 CSS で書く。
  - 同じクラスの組み合わせが 3 箇所以上になったら、Hono JSX の関数コンポーネントに切り出す。
- Lism は npm パッケージ（`lism-css`）を `package.json` に入れ、版を固定して Worker に同梱する。CDN からは読み込まない。
- 自作の `.c--*` と Lism の CSS を、Worker の同一オリジンから 1 本の CSS として返す。`<link>` は `src/views/layout.tsx` の 1 か所で持つ。
- Hono JSX では Lism の React/Astro コンポーネントを使えないため、クラス文字列を直接書く。
- 実装時は `lism-css-guide` スキルを参照する。

## 理由・検討した代替案

- Lism は CSS 1 ファイルで導入でき、フロント専用のビルドを増やさない（ADR-0006）。
- **同梱にする理由**: CSS を取得できないことと、アプリを呼び出せないことが一致する。CDN だと、アプリは動くのに見た目だけ崩れる状態がありえる。htmx も同じ理由で同梱に改める（[ADR-0013](0013-bundle-frontend-assets.md)）。
- 自作 CSS は自前で配信するので、Lism を同じ経路に載せるのに追加の仕組みは要らない。完全性は `pnpm-lock.yaml` のハッシュが担保し、SRI の手計算も要らない。
- レイヤー、トークン、命名規則までを含み、自作 CSS の置き場（`.c--*`）が決まっている。規律を自分で作らずに済む。
- **Lism を CDN から読み込む案**: 採らない。ADR-0010 と形は揃うが、CDN だけが落ちたときに見た目だけ崩れる。自作 CSS の配信経路があるので、CDN にする利点も薄い。
- **Tailwind CSS**: 採らない。CSS の生成にビルドが要り、ADR-0006 の前提が崩れる。生成物の配信には静的アセットの設定も要る。単一プロパティのクラスの外にある CSS の置き場も決まっていない。
- **`hono/css`（CSS-in-JS）**: 採らない。標準 CSS で書けて依存も増えないが、規律を自作することになり、スタイルが JSX に混ざる。`Style` は experimental で、htmx の断片では inline script を差し込む仕組みに頼る。
- **クラスレス CSS（Pico など）**: 採らない。見た目は整うが、自作部分の規律にならない。
- **自前 CSS + 自作規約**: 採らない。規約を保つ負担が自分に残る。

## 影響

- Lism 独自の語彙（`l--*`、`-p:20`、`set--*`、`u--*`）を覚える必要がある。標準 CSS だけで書く場合より学習コストがかかる。
- Lism は 0.x 系で、版を上げるときに破壊的変更がありうる。版は `package.json` で固定し、上げるときは画面を目視で確認する。
- CSS は Worker から返すので、Access の前段を通る。オフラインでも、Worker に届くなら見た目は崩れない。
- 未検証: CSS を Worker に同梱する方法（wrangler の `rules` で `.css` をテキストとして import する案、`assets` バインディングの案）と、vitest 側の設定。CSS のサイズ。最初の画面に当てるときに検証し、必要なら追記ではなく新しい ADR で置換する。

## 実装で確定したこと（TASK-28）

- 導入した版は `lism-css@1.0.1`。独自クラスを置くレイヤー名は `lism-custom`（`lism-css-guide` スキルの `lism-component` は 0.16 時点の名前）。`.c--*` を書くときは同梱した CSS の `@layer` 宣言で名前を確かめる。
- 配信方法は [ADR-0013](0013-bundle-frontend-assets.md) に記した。
