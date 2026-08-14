CREATE TABLE consultant_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  submission_id uuid NOT NULL UNIQUE REFERENCES form_submissions(id),
  author_user_id uuid NOT NULL REFERENCES users(id),
  body_ciphertext bytea NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE consultant_note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES consultant_notes(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  submission_id uuid NOT NULL REFERENCES form_submissions(id),
  author_user_id uuid NOT NULL REFERENCES users(id),
  body_ciphertext bytea NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, version)
);

CREATE INDEX consultant_note_versions_submission_idx ON consultant_note_versions(submission_id, version DESC);

CREATE FUNCTION prevent_consultant_note_version_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable resource: consultant_note_versions' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consultant_note_versions_immutable BEFORE UPDATE OR DELETE ON consultant_note_versions
FOR EACH ROW EXECUTE FUNCTION prevent_consultant_note_version_mutation();

REVOKE UPDATE, DELETE ON consultant_note_versions FROM PUBLIC;
