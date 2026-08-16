CREATE TYPE protein_target_source AS ENUM ('built_in', 'physical_ruler', 'manual');

CREATE TABLE protein_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id),
  submission_id uuid NOT NULL UNIQUE REFERENCES form_submissions(id), updated_by uuid NOT NULL REFERENCES users(id),
  source protein_target_source NOT NULL, bmi_exact numeric(5,2), bmi_rounded integer,
  protein_factor_g integer NOT NULL, target_min_g integer NOT NULL, target_max_g integer NOT NULL,
  reason_ciphertext bytea NOT NULL, version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (protein_factor_g > 0 AND target_min_g > 0 AND target_max_g >= target_min_g),
  CHECK ((source = 'built_in' AND bmi_exact IS NOT NULL AND bmi_rounded IS NOT NULL) OR source <> 'built_in')
);

CREATE TABLE protein_target_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_id uuid NOT NULL REFERENCES protein_targets(id),
  client_id uuid NOT NULL REFERENCES clients(id), submission_id uuid NOT NULL REFERENCES form_submissions(id),
  updated_by uuid NOT NULL REFERENCES users(id), source protein_target_source NOT NULL,
  bmi_exact numeric(5,2), bmi_rounded integer, protein_factor_g integer NOT NULL,
  target_min_g integer NOT NULL, target_max_g integer NOT NULL, reason_ciphertext bytea NOT NULL,
  version integer NOT NULL CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_id, version)
);
CREATE INDEX protein_target_versions_submission_idx ON protein_target_versions(submission_id, version DESC);
CREATE TRIGGER protein_target_versions_immutable BEFORE UPDATE OR DELETE ON protein_target_versions
FOR EACH ROW EXECUTE FUNCTION prevent_consultant_note_version_mutation();
REVOKE UPDATE, DELETE ON protein_target_versions FROM PUBLIC;
