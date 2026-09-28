CREATE TABLE professional_conclusion_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, submission_id uuid NOT NULL UNIQUE,
 updated_by uuid NOT NULL, source_hash text NOT NULL, status text NOT NULL,
 payload_ciphertext bytea NOT NULL, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE professional_conclusion_draft_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), draft_id uuid NOT NULL, client_id uuid NOT NULL, submission_id uuid NOT NULL,
 updated_by uuid NOT NULL, source_hash text NOT NULL, status text NOT NULL, payload_ciphertext bytea NOT NULL,
 version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(draft_id,version)
);
