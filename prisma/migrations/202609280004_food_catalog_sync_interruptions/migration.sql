ALTER TABLE "food_catalog_sync_runs"
  ADD COLUMN "heartbeat_at" TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE "food_catalog_sync_runs"
  DROP CONSTRAINT "food_catalog_sync_runs_status_check",
  DROP CONSTRAINT "food_catalog_sync_runs_completion_check";

ALTER TABLE "food_catalog_sync_runs"
  ADD CONSTRAINT "food_catalog_sync_runs_status_check"
    CHECK ("status" IN ('running','succeeded','failed','interrupted')),
  ADD CONSTRAINT "food_catalog_sync_runs_completion_check" CHECK (
    ("status" = 'running' AND "completed_at" IS NULL) OR
    ("status" IN ('succeeded','failed','interrupted') AND "completed_at" IS NOT NULL)
  );

CREATE INDEX "food_catalog_sync_runs_running_heartbeat_idx"
  ON "food_catalog_sync_runs"("heartbeat_at") WHERE "status" = 'running';
