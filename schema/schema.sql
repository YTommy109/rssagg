-- スキーマの単一情報源。差分は Atlas が migrations/ に生成する（atlas.hcl）。
-- 時刻は epoch 秒の INTEGER。D1 は外部キーを常に強制するため、親の削除で子が連鎖して消える。

CREATE TABLE feeds (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
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
