-- スキーマの単一情報源。差分は Atlas が migrations/ に生成する（atlas.hcl）。
-- 時刻は epoch 秒の INTEGER。D1 は外部キーを常に強制するため、親の削除で子が連鎖して消える。

CREATE TABLE feeds (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  -- 条件付き GET 用。次回の取得で If-None-Match / If-Modified-Since に使い、更新が無ければ本文を取り直さない。
  etag TEXT,
  last_modified TEXT,
  -- ユーザー定義の自由文字列（ADR-0011）。NULL は未設定で、記事一覧の絞り込みの対象外（記事は隠さない）。
  genre TEXT,
  created_at INTEGER NOT NULL
);

-- 本文は持たない（要約・抜粋のみ）。全文は「後で読む」で保存した記事だけ R2 に置く。
CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  feed_id INTEGER NOT NULL REFERENCES feeds (id) ON DELETE CASCADE,
  -- フィード内での記事の識別子。再取得で同じ記事を二重登録しないために一意にする。
  guid TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  summary TEXT,
  published_at INTEGER,
  fetched_at INTEGER NOT NULL,
  read_at INTEGER,
  UNIQUE (feed_id, guid)
);

-- 複数のフィードが同じ記事を配信しても 1 件にする。url は取得時に正規化済み（feed-parse の normalizeUrl）。
CREATE UNIQUE INDEX articles_url ON articles (url);

-- 一覧は新しい順に引くため。公開日時が無いフィードは取得日時で代用する。
CREATE INDEX articles_recent ON articles (COALESCE(published_at, fetched_at) DESC);

-- 記事ごと・トピックごとの確率。除外は閲覧時にトピックの include/exclude と突き合わせて決めるので、
-- 除外フラグは持たない。トピックを自由文字列にしているのは、分類方式（固定・自由タグ・ユーザー定義）が未決のため。
CREATE TABLE judgments (
  article_id INTEGER NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score REAL NOT NULL CHECK (score BETWEEN 0 AND 1),
  judged_at INTEGER NOT NULL,
  PRIMARY KEY (article_id, topic)
) WITHOUT ROWID;

-- 「後で読む」。1 記事 1 行なので article_id を主キーにする。
CREATE TABLE saved (
  article_id INTEGER PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  saved_at INTEGER NOT NULL,
  -- R2 のオブジェクトキー。アーカイブ形式が決まるまで、保存しただけの行は NULL になる。
  archive_key TEXT
);
