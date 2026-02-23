ALTER TABLE "upload_sessions"
  ALTER COLUMN "file_size" TYPE bigint;

ALTER TABLE "images"
  ALTER COLUMN "size_original" TYPE bigint,
  ALTER COLUMN "size_sm" TYPE bigint,
  ALTER COLUMN "size_lg" TYPE bigint;

ALTER TABLE "videos"
  ALTER COLUMN "size_original" TYPE bigint,
  ALTER COLUMN "size_sm" TYPE bigint,
  ALTER COLUMN "size_lg" TYPE bigint;

ALTER TABLE "documents"
  ALTER COLUMN "size_original" TYPE bigint,
  ALTER COLUMN "size_sm" TYPE bigint,
  ALTER COLUMN "size_lg" TYPE bigint;

ALTER TABLE "files"
  ALTER COLUMN "size_original" TYPE bigint,
  ALTER COLUMN "size_sm" TYPE bigint,
  ALTER COLUMN "size_lg" TYPE bigint;
