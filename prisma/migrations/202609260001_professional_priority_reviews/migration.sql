CREATE TABLE professional_priority_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, submission_id uuid NOT NULL UNIQUE,
  updated_by uuid NOT NULL, source_hash text NOT NULL, selected_priority_keys jsonb NOT NULL,
  reason_ciphertext bytea NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE professional_priority_review_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), review_id uuid NOT NULL, client_id uuid NOT NULL,
  submission_id uuid NOT NULL, updated_by uuid NOT NULL, source_hash text NOT NULL,
  selected_priority_keys jsonb NOT NULL, reason_ciphertext bytea NOT NULL, version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(review_id,version)
);
