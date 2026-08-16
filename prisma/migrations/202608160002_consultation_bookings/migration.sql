CREATE TYPE consultation_booking_status AS ENUM ('pending', 'scheduled', 'needs_reminder');

CREATE TABLE consultation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  submission_id uuid NOT NULL UNIQUE REFERENCES form_submissions(id),
  updated_by uuid NOT NULL REFERENCES users(id),
  status consultation_booking_status NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz,
  contact_note_ciphertext bytea NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'scheduled' AND scheduled_at IS NOT NULL) OR (status <> 'scheduled' AND scheduled_at IS NULL))
);

CREATE TABLE consultation_booking_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES consultation_bookings(id),
  client_id uuid NOT NULL REFERENCES clients(id), submission_id uuid NOT NULL REFERENCES form_submissions(id),
  updated_by uuid NOT NULL REFERENCES users(id), status consultation_booking_status NOT NULL, scheduled_at timestamptz,
  contact_note_ciphertext bytea NOT NULL, version integer NOT NULL CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, version)
);
CREATE INDEX consultation_booking_versions_submission_idx ON consultation_booking_versions(submission_id, version DESC);

CREATE TRIGGER consultation_booking_versions_immutable BEFORE UPDATE OR DELETE ON consultation_booking_versions
FOR EACH ROW EXECUTE FUNCTION prevent_consultant_note_version_mutation();
REVOKE UPDATE, DELETE ON consultation_booking_versions FROM PUBLIC;
