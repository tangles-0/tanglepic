ALTER TABLE "app_settings"
  ADD COLUMN "resumable_threshold_bytes" bigint NOT NULL DEFAULT 67108864;
