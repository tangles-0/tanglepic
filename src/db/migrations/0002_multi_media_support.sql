CREATE TABLE "videos" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "album_id" text REFERENCES "albums"("id"),
  "album_caption" text,
  "album_order" integer NOT NULL DEFAULT 0,
  "base_name" text NOT NULL,
  "ext" text NOT NULL,
  "mime_type" text NOT NULL,
  "duration_seconds" integer,
  "width" integer,
  "height" integer,
  "size_original" integer NOT NULL DEFAULT 0,
  "size_sm" integer NOT NULL DEFAULT 0,
  "size_lg" integer NOT NULL DEFAULT 0,
  "preview_status" text NOT NULL DEFAULT 'pending',
  "preview_error" text,
  "uploaded_at" timestamp NOT NULL
);

CREATE TABLE "documents" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "album_id" text REFERENCES "albums"("id"),
  "album_caption" text,
  "album_order" integer NOT NULL DEFAULT 0,
  "base_name" text NOT NULL,
  "ext" text NOT NULL,
  "mime_type" text NOT NULL,
  "page_count" integer,
  "size_original" integer NOT NULL DEFAULT 0,
  "size_sm" integer NOT NULL DEFAULT 0,
  "size_lg" integer NOT NULL DEFAULT 0,
  "preview_status" text NOT NULL DEFAULT 'pending',
  "preview_error" text,
  "uploaded_at" timestamp NOT NULL
);

CREATE TABLE "files" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "album_id" text REFERENCES "albums"("id"),
  "album_caption" text,
  "album_order" integer NOT NULL DEFAULT 0,
  "base_name" text NOT NULL,
  "ext" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_original" integer NOT NULL DEFAULT 0,
  "size_sm" integer NOT NULL DEFAULT 0,
  "size_lg" integer NOT NULL DEFAULT 0,
  "preview_status" text NOT NULL DEFAULT 'pending',
  "preview_error" text,
  "uploaded_at" timestamp NOT NULL
);

CREATE TABLE "video_shares" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "video_id" text NOT NULL REFERENCES "videos"("id"),
  "code" text UNIQUE,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "document_shares" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "document_id" text NOT NULL REFERENCES "documents"("id"),
  "code" text UNIQUE,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "file_shares" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "file_id" text NOT NULL REFERENCES "files"("id"),
  "code" text UNIQUE,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "upload_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "backend" text NOT NULL DEFAULT 'local',
  "target_type" text NOT NULL DEFAULT 'file',
  "mime_type" text NOT NULL,
  "ext" text NOT NULL,
  "file_name" text NOT NULL,
  "file_size" integer NOT NULL DEFAULT 0,
  "chunk_size" integer NOT NULL DEFAULT 0,
  "total_parts" integer NOT NULL DEFAULT 0,
  "state" text NOT NULL DEFAULT 'initiated',
  "storage_key" text,
  "s3_upload_id" text,
  "uploaded_parts_json" text NOT NULL DEFAULT '{}',
  "checksum" text,
  "error" text,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);
