-- Add column "etag" to table: "feeds"
ALTER TABLE `feeds` ADD COLUMN `etag` text NULL;
-- Add column "last_modified" to table: "feeds"
ALTER TABLE `feeds` ADD COLUMN `last_modified` text NULL;
