CREATE TYPE protein_origin AS ENUM ('plant', 'animal', 'mixed');
CREATE TYPE food_product_status AS ENUM ('draft', 'verified', 'retired');

CREATE TABLE food_product_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), canonical_name text NOT NULL,
  protein_per_100g numeric(7,3) NOT NULL CHECK (protein_per_100g >= 0 AND protein_per_100g <= 100),
  origin protein_origin NOT NULL, plant_share_percent integer NOT NULL CHECK (plant_share_percent BETWEEN 0 AND 100),
  source_label text NOT NULL, source_reference text, status food_product_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES users(id), verified_by uuid REFERENCES users(id), verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK ((origin='plant' AND plant_share_percent=100) OR (origin='animal' AND plant_share_percent=0) OR origin='mixed'),
  CHECK ((status='verified' AND verified_by IS NOT NULL AND verified_at IS NOT NULL) OR status<>'verified')
);
CREATE INDEX food_product_cards_status_name_idx ON food_product_cards(status, canonical_name);

CREATE TABLE protein_intake_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id),
  submission_id uuid NOT NULL UNIQUE REFERENCES form_submissions(id), updated_by uuid NOT NULL REFERENCES users(id),
  payload_ciphertext bytea NOT NULL, total_protein_g numeric(8,2) NOT NULL, plant_protein_g numeric(8,2) NOT NULL,
  animal_protein_g numeric(8,2) NOT NULL, completeness_percent integer NOT NULL CHECK (completeness_percent BETWEEN 0 AND 100),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (total_protein_g >= 0 AND plant_protein_g >= 0 AND animal_protein_g >= 0),
  CHECK (abs(total_protein_g - plant_protein_g - animal_protein_g) <= 0.02)
);

CREATE TABLE protein_intake_assessment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES protein_intake_assessments(id),
  client_id uuid NOT NULL REFERENCES clients(id), submission_id uuid NOT NULL REFERENCES form_submissions(id), updated_by uuid NOT NULL REFERENCES users(id),
  payload_ciphertext bytea NOT NULL, total_protein_g numeric(8,2) NOT NULL, plant_protein_g numeric(8,2) NOT NULL,
  animal_protein_g numeric(8,2) NOT NULL, completeness_percent integer NOT NULL CHECK (completeness_percent BETWEEN 0 AND 100),
  version integer NOT NULL CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, version), CHECK (total_protein_g >= 0 AND plant_protein_g >= 0 AND animal_protein_g >= 0),
  CHECK (abs(total_protein_g - plant_protein_g - animal_protein_g) <= 0.02)
);
CREATE INDEX protein_intake_versions_submission_idx ON protein_intake_assessment_versions(submission_id, version DESC);
CREATE TRIGGER protein_intake_versions_immutable BEFORE UPDATE OR DELETE ON protein_intake_assessment_versions
FOR EACH ROW EXECUTE FUNCTION prevent_consultant_note_version_mutation();
REVOKE UPDATE, DELETE ON protein_intake_assessment_versions FROM PUBLIC;
