CREATE TYPE fat_goal AS ENUM ('maintain','weight_loss');
CREATE TYPE fat_activity AS ENUM ('low','moderate','high','very_high');
CREATE TABLE fat_targets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id), submission_id uuid NOT NULL UNIQUE REFERENCES form_submissions(id), updated_by uuid NOT NULL REFERENCES users(id),
 energy_kcal integer NOT NULL CHECK(energy_kcal BETWEEN 800 AND 8000), weight_kg numeric(6,2) NOT NULL CHECK(weight_kg BETWEEN 25 AND 400), goal fat_goal NOT NULL, activity fat_activity NOT NULL,
 energy_percent_min integer NOT NULL, energy_percent_max integer NOT NULL, target_min_g numeric(7,1) NOT NULL, target_max_g numeric(7,1) NOT NULL, grams_per_kg_min numeric(5,2) NOT NULL, grams_per_kg_max numeric(5,2) NOT NULL,
 reason_ciphertext bytea NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(energy_percent_min>=15 AND energy_percent_max<=35 AND energy_percent_min<=energy_percent_max), CHECK(target_min_g>0 AND target_max_g>=target_min_g)
);
CREATE TABLE fat_target_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_id uuid NOT NULL REFERENCES fat_targets(id), client_id uuid NOT NULL REFERENCES clients(id), submission_id uuid NOT NULL REFERENCES form_submissions(id), updated_by uuid NOT NULL REFERENCES users(id),
 energy_kcal integer NOT NULL, weight_kg numeric(6,2) NOT NULL, goal fat_goal NOT NULL, activity fat_activity NOT NULL, energy_percent_min integer NOT NULL, energy_percent_max integer NOT NULL,
 target_min_g numeric(7,1) NOT NULL, target_max_g numeric(7,1) NOT NULL, grams_per_kg_min numeric(5,2) NOT NULL, grams_per_kg_max numeric(5,2) NOT NULL, reason_ciphertext bytea NOT NULL,
 version integer NOT NULL CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(target_id,version)
);
CREATE INDEX fat_target_versions_submission_idx ON fat_target_versions(submission_id,version DESC);
CREATE TRIGGER fat_target_versions_immutable BEFORE UPDATE OR DELETE ON fat_target_versions FOR EACH ROW EXECUTE FUNCTION prevent_consultant_note_version_mutation();
REVOKE UPDATE,DELETE ON fat_target_versions FROM PUBLIC;
