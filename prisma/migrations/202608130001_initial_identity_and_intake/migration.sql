CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'consultant', 'client');
CREATE TYPE user_status AS ENUM ('invited', 'active', 'suspended', 'revoked');
CREATE TYPE client_status AS ENUM ('prospect', 'active', 'archived');
CREATE TYPE assignment_status AS ENUM ('active', 'ended');
CREATE TYPE form_schema_id AS ENUM ('forms_v1_49_columns', 'forms_v2_76_columns');
CREATE TYPE form_source_type AS ENUM ('csv', 'google_sheets', 'manual_test');
CREATE TYPE import_status AS ENUM ('received', 'verified', 'blocked', 'accepted');
CREATE TYPE consent_status AS ENUM ('verified', 'not_verified', 'declined');
CREATE TYPE audit_decision AS ENUM ('ALLOW', 'DENY', 'SUCCESS', 'FAILURE');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email_normalized text NOT NULL UNIQUE,
  display_name text NOT NULL, role user_role NOT NULL, status user_status NOT NULL DEFAULT 'invited',
  auth_subject text NOT NULL UNIQUE, session_revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (email_normalized = lower(email_normalized))
);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid UNIQUE REFERENCES users(id),
  status client_status NOT NULL DEFAULT 'prospect', created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE client_identity (
  client_id uuid PRIMARY KEY REFERENCES clients(id), full_name_ciphertext bytea NOT NULL,
  phone_ciphertext bytea, telegram_ciphertext bytea, sex text, birth_date date,
  height_cm numeric(5,2), weight_kg numeric(6,2), waist_cm numeric(5,2), hips_cm numeric(5,2), calf_cm numeric(5,2),
  updated_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (height_cm IS NULL OR height_cm > 0), CHECK (weight_kg IS NULL OR weight_kg > 0)
);

CREATE TABLE consultant_client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id),
  consultant_user_id uuid NOT NULL REFERENCES users(id), status assignment_status NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz, assigned_by uuid NOT NULL REFERENCES users(id),
  reason_code text NOT NULL, CHECK ((status = 'active' AND ended_at IS NULL) OR (status = 'ended' AND ended_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_active_assignment_per_client ON consultant_client_assignments(client_id) WHERE status = 'active';

CREATE TABLE form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id), schema_id form_schema_id NOT NULL,
  source_type form_source_type NOT NULL, source_response_id text, source_submitted_at timestamptz,
  header_fingerprint text NOT NULL, payload_ciphertext bytea NOT NULL, payload_hash text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  import_status import_status NOT NULL DEFAULT 'received', block_code text, consent_status consent_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((import_status <> 'accepted') OR (consent_status = 'verified' AND block_code IS NULL))
);
CREATE UNIQUE INDEX unique_submission_source ON form_submissions(source_type, source_response_id) WHERE source_response_id IS NOT NULL;
CREATE UNIQUE INDEX unique_submission_payload_hash ON form_submissions(payload_hash);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurred_at timestamptz NOT NULL DEFAULT now(), request_id text NOT NULL,
  actor_user_id uuid REFERENCES users(id), actor_role user_role, action text NOT NULL, resource_type text NOT NULL,
  resource_id uuid, client_id uuid REFERENCES clients(id), decision audit_decision NOT NULL, reason_code text NOT NULL,
  ip_hash text, user_agent_hash text
);
CREATE INDEX audit_events_occurred_at_idx ON audit_events(occurred_at);
CREATE INDEX audit_events_client_id_idx ON audit_events(client_id);

REVOKE UPDATE, DELETE ON form_submissions, audit_events FROM PUBLIC;

CREATE FUNCTION reject_immutable_row_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'immutable resource: %', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER form_submissions_immutable BEFORE UPDATE OR DELETE ON form_submissions
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_row_change();
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_row_change();
