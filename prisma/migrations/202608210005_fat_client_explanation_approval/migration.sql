CREATE TABLE "fat_client_explanation_approvals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL REFERENCES "clients"("id"),
  "submission_id" uuid NOT NULL UNIQUE REFERENCES "form_submissions"("id"),
  "source_intake_version" integer NOT NULL CHECK ("source_intake_version" > 0),
  "target_version" integer NOT NULL CHECK ("target_version" >= 0),
  "explanation_hash" text NOT NULL,
  "approved_by" uuid NOT NULL REFERENCES "users"("id"),
  "approved_at" timestamptz NOT NULL DEFAULT now(),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
