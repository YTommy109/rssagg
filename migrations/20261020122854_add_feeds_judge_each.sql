-- Add column "judge_each" to table: "feeds"
ALTER TABLE `feeds` ADD COLUMN `judge_each` integer NOT NULL DEFAULT 0;
