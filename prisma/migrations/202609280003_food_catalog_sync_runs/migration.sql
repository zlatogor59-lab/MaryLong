CREATE TABLE "food_catalog_sync_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "operation" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "result_summary" JSONB,
  "integrity_summary" JSONB,
  "error_code" TEXT,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "food_catalog_sync_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "food_catalog_sync_runs_status_check" CHECK ("status" IN ('running','succeeded','failed')),
  CONSTRAINT "food_catalog_sync_runs_completion_check" CHECK (
    ("status" = 'running' AND "completed_at" IS NULL) OR
    ("status" IN ('succeeded','failed') AND "completed_at" IS NOT NULL)
  )
);

CREATE INDEX "food_catalog_sync_runs_started_at_idx" ON "food_catalog_sync_runs"("started_at");
CREATE INDEX "food_catalog_sync_runs_operation_started_at_idx" ON "food_catalog_sync_runs"("operation","started_at");
