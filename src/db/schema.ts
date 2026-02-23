import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const groupLimits = pgTable("group_limits", {
  id: text("id").primaryKey(),
  groupId: text("group_id").references(() => groups.id),
  maxFileSize: integer("max_file_size").notNull(),
  allowedTypes: text("allowed_types").notNull(),
  rateLimitPerMinute: integer("rate_limit_per_minute").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey(),
  motd: text("motd").notNull(),
  costThisMonth: integer("cost_this_month").notNull(),
  fundedThisMonth: integer("funded_this_month").notNull(),
  donateUrl: text("donate_url"),
  supportEnabled: boolean("support_enabled").notNull().default(true),
  signupsEnabled: boolean("signups_enabled").notNull().default(true),
  uploadsEnabled: boolean("uploads_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  groupId: text("group_id").references(() => groups.id),
  theme: text("theme").notNull().default("dark"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  lastPatchNoteDismissed: timestamp("last_patch_note_dismissed", { mode: "date" }),
});

export const patchNotes = pgTable("patch_notes", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

export const albums = pgTable("albums", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const images = pgTable("images", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  albumId: text("album_id").references(() => albums.id),
  albumCaption: text("album_caption"),
  albumOrder: integer("album_order").notNull().default(0),
  baseName: text("base_name").notNull(),
  ext: text("ext").notNull().default("jpg"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeOriginal: integer("size_original").notNull().default(0),
  sizeSm: integer("size_sm").notNull().default(0),
  sizeLg: integer("size_lg").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull(),
});

export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  albumId: text("album_id").references(() => albums.id),
  albumCaption: text("album_caption"),
  albumOrder: integer("album_order").notNull().default(0),
  baseName: text("base_name").notNull(),
  ext: text("ext").notNull(),
  mimeType: text("mime_type").notNull(),
  durationSeconds: integer("duration_seconds"),
  width: integer("width"),
  height: integer("height"),
  sizeOriginal: integer("size_original").notNull().default(0),
  sizeSm: integer("size_sm").notNull().default(0),
  sizeLg: integer("size_lg").notNull().default(0),
  previewStatus: text("preview_status").notNull().default("pending"),
  previewError: text("preview_error"),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull(),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  albumId: text("album_id").references(() => albums.id),
  albumCaption: text("album_caption"),
  albumOrder: integer("album_order").notNull().default(0),
  baseName: text("base_name").notNull(),
  ext: text("ext").notNull(),
  mimeType: text("mime_type").notNull(),
  pageCount: integer("page_count"),
  sizeOriginal: integer("size_original").notNull().default(0),
  sizeSm: integer("size_sm").notNull().default(0),
  sizeLg: integer("size_lg").notNull().default(0),
  previewStatus: text("preview_status").notNull().default("pending"),
  previewError: text("preview_error"),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull(),
});

export const files = pgTable("files", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  albumId: text("album_id").references(() => albums.id),
  albumCaption: text("album_caption"),
  albumOrder: integer("album_order").notNull().default(0),
  baseName: text("base_name").notNull(),
  ext: text("ext").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeOriginal: integer("size_original").notNull().default(0),
  sizeSm: integer("size_sm").notNull().default(0),
  sizeLg: integer("size_lg").notNull().default(0),
  previewStatus: text("preview_status").notNull().default("pending"),
  previewError: text("preview_error"),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull(),
});

export const shares = pgTable("shares", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  imageId: text("image_id")
    .notNull()
    .references(() => images.id),
  code: text("code").unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const videoShares = pgTable("video_shares", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  videoId: text("video_id")
    .notNull()
    .references(() => videos.id),
  code: text("code").unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const documentShares = pgTable("document_shares", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id),
  code: text("code").unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const fileShares = pgTable("file_shares", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  fileId: text("file_id")
    .notNull()
    .references(() => files.id),
  code: text("code").unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const albumShares = pgTable("album_shares", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  albumId: text("album_id")
    .notNull()
    .references(() => albums.id),
  code: text("code").unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const uploadSessions = pgTable("upload_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  backend: text("backend").notNull().default("local"),
  targetType: text("target_type").notNull().default("file"),
  mimeType: text("mime_type").notNull(),
  ext: text("ext").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  chunkSize: integer("chunk_size").notNull().default(0),
  totalParts: integer("total_parts").notNull().default(0),
  state: text("state").notNull().default("initiated"),
  storageKey: text("storage_key"),
  s3UploadId: text("s3_upload_id"),
  uploadedPartsJson: text("uploaded_parts_json").notNull().default("{}"),
  checksum: text("checksum"),
  error: text("error"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

