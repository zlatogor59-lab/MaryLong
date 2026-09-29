CREATE TABLE "daily_ration_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "submission_id" UUID NOT NULL,
  "assessment_id" UUID NOT NULL,
  "intake_version" INTEGER NOT NULL,
  "ration_date" DATE NOT NULL,
  "captured_by" UUID NOT NULL,
  "payload_ciphertext" BYTEA NOT NULL,
  "total_protein_g" DECIMAL(8,2) NOT NULL,
  "plant_protein_g" DECIMAL(8,2) NOT NULL,
  "animal_protein_g" DECIMAL(8,2) NOT NULL,
  "completeness_percent" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_ration_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_ration_snapshots_submission_date_key" UNIQUE ("submission_id", "ration_date"),
  CONSTRAINT "daily_ration_snapshots_assessment_version_key" UNIQUE ("assessment_id", "intake_version"),
  CONSTRAINT "daily_ration_snapshots_client_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT,
  CONSTRAINT "daily_ration_snapshots_submission_fkey" FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id") ON DELETE RESTRICT,
  CONSTRAINT "daily_ration_snapshots_assessment_fkey" FOREIGN KEY ("assessment_id") REFERENCES "protein_intake_assessments"("id") ON DELETE RESTRICT,
  CONSTRAINT "daily_ration_snapshots_captured_by_fkey" FOREIGN KEY ("captured_by") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "daily_ration_snapshots_completeness_check" CHECK ("completeness_percent" BETWEEN 0 AND 100),
  CONSTRAINT "daily_ration_snapshots_totals_check" CHECK ("total_protein_g" >= 0 AND "plant_protein_g" >= 0 AND "animal_protein_g" >= 0),
  CONSTRAINT "daily_ration_snapshots_balance_check" CHECK (abs("total_protein_g" - "plant_protein_g" - "animal_protein_g") <= 0.02)
);

CREATE INDEX "daily_ration_snapshots_client_date_idx" ON "daily_ration_snapshots"("client_id", "ration_date" DESC);

CREATE OR REPLACE FUNCTION reject_daily_ration_snapshot_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'daily ration snapshots are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "daily_ration_snapshots_immutable"
BEFORE UPDATE OR DELETE ON "daily_ration_snapshots"
FOR EACH ROW EXECUTE FUNCTION reject_daily_ration_snapshot_mutation();

REVOKE UPDATE, DELETE ON "daily_ration_snapshots" FROM PUBLIC;
