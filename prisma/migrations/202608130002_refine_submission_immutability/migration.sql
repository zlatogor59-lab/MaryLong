DROP TRIGGER form_submissions_immutable ON form_submissions;

CREATE FUNCTION protect_submission_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'immutable resource: form_submissions' USING ERRCODE = '55000';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.client_id IS DISTINCT FROM OLD.client_id
    OR NEW.schema_id IS DISTINCT FROM OLD.schema_id
    OR NEW.source_type IS DISTINCT FROM OLD.source_type
    OR NEW.source_response_id IS DISTINCT FROM OLD.source_response_id
    OR NEW.source_submitted_at IS DISTINCT FROM OLD.source_submitted_at
    OR NEW.header_fingerprint IS DISTINCT FROM OLD.header_fingerprint
    OR NEW.payload_ciphertext IS DISTINCT FROM OLD.payload_ciphertext
    OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.consent_status IS DISTINCT FROM OLD.consent_status
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'immutable submission source fields' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER form_submissions_source_immutable BEFORE UPDATE OR DELETE ON form_submissions
  FOR EACH ROW EXECUTE FUNCTION protect_submission_source();
