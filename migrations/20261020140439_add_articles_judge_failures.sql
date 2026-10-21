-- Add column "judge_failures" to table: "articles"
ALTER TABLE `articles` ADD COLUMN `judge_failures` integer NOT NULL DEFAULT 0;
-- Add column "judge_failed_at" to table: "articles"
ALTER TABLE `articles` ADD COLUMN `judge_failed_at` integer NULL;
