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
  baseName: text("base_name").notNull(),
  ext: text("ext").notNull().default("jpg"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeOriginal: integer("size_original").notNull().default(0),
  sizeSm: integer("size_sm").notNull().default(0),
  sizeLg: integer("size_lg").notNull().default(0),
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

