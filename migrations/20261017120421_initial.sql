-- Create "feeds" table
CREATE TABLE `feeds` (`id` integer NULL, `url` text NOT NULL, `title` text NULL, `created_at` integer NOT NULL, PRIMARY KEY (`id`));
-- Create index "feeds_url" to table: "feeds"
CREATE UNIQUE INDEX `feeds_url` ON `feeds` (`url`);
-- Create "articles" table
CREATE TABLE `articles` (`id` integer NULL, `feed_id` integer NOT NULL, `guid` text NOT NULL, `url` text NOT NULL, `title` text NOT NULL, `excerpt` text NULL, `summary` text NULL, `published_at` integer NULL, `fetched_at` integer NOT NULL, `read_at` integer NULL, PRIMARY KEY (`id`), CONSTRAINT `0` FOREIGN KEY (`feed_id`) REFERENCES `feeds` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE);
-- Create index "articles_feed_id_guid" to table: "articles"
CREATE UNIQUE INDEX `articles_feed_id_guid` ON `articles` (`feed_id`, `guid`);
-- Create index "articles_recent" to table: "articles"
CREATE INDEX `articles_recent` ON `articles` ((COALESCE(published_at, fetched_at)) DESC);
-- Create "judgments" table
CREATE TABLE `judgments` (`article_id` integer NOT NULL, `topic` text NOT NULL, `score` real NOT NULL, `judged_at` integer NOT NULL, PRIMARY KEY (`article_id`, `topic`), CONSTRAINT `0` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE, CHECK (score BETWEEN 0 AND 1)) WITHOUT ROWID;
-- Create "saved" table
CREATE TABLE `saved` (`article_id` integer NULL, `saved_at` integer NOT NULL, `archive_key` text NULL, PRIMARY KEY (`article_id`), CONSTRAINT `0` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE);
