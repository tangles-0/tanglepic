ALTER TABLE "group_limits"
  ALTER COLUMN "max_file_size" TYPE bigint;

ALTER TABLE "group_limits"
  ADD COLUMN "max_image_size" bigint NOT NULL DEFAULT 536870912,
  ADD COLUMN "max_video_size" bigint NOT NULL DEFAULT 536870912,
  ADD COLUMN "max_document_size" bigint NOT NULL DEFAULT 536870912,
  ADD COLUMN "max_other_size" bigint NOT NULL DEFAULT 536870912;

UPDATE "group_limits"
SET
  "max_image_size" = COALESCE("max_image_size", "max_file_size"),
  "max_video_size" = COALESCE("max_video_size", "max_file_size"),
  "max_document_size" = COALESCE("max_document_size", "max_file_size"),
  "max_other_size" = COALESCE("max_other_size", "max_file_size");

UPDATE "group_limits"
SET "max_file_size" = GREATEST(
  "max_image_size",
  "max_video_size",
  "max_document_size",
  "max_other_size"
);
