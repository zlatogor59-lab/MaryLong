\set ON_ERROR_STOP on
BEGIN;

INSERT INTO users (id,email_normalized,display_name,role,status,auth_subject) VALUES
('00000000-0000-0000-0000-000000000001','consultant@example.test','Synthetic Consultant','consultant','active','synthetic-consultant'),
('00000000-0000-0000-0000-000000000002','admin@example.test','Synthetic Admin','admin','active','synthetic-admin');
INSERT INTO clients (id,status,created_by) VALUES
('00000000-0000-0000-0000-000000000010','active','00000000-0000-0000-0000-000000000001');
INSERT INTO consultant_client_assignments (client_id,consultant_user_id,status,assigned_by,reason_code)
VALUES ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','active','00000000-0000-0000-0000-000000000002','SYNTHETIC_TEST');

DO $$ BEGIN
  BEGIN
    INSERT INTO consultant_client_assignments (client_id,consultant_user_id,status,assigned_by,reason_code)
    VALUES ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','active','00000000-0000-0000-0000-000000000002','SYNTHETIC_TEST');
    RAISE EXCEPTION 'expected one_active_assignment_per_client violation';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

DO $$ BEGIN
  BEGIN
    INSERT INTO form_submissions (id,client_id,schema_id,source_type,source_response_id,header_fingerprint,payload_ciphertext,payload_hash,idempotency_key,import_status,consent_status)
    VALUES ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010','forms_v2_76_columns','manual_test','synthetic-1','fp',decode('01','hex'),'hash-1','idem-1','accepted','not_verified');
    RAISE EXCEPTION 'expected consent acceptance violation';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

INSERT INTO form_submissions (id,client_id,schema_id,source_type,source_response_id,header_fingerprint,payload_ciphertext,payload_hash,idempotency_key,import_status,consent_status)
VALUES ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010','forms_v2_76_columns','manual_test','synthetic-1','fp',decode('01','hex'),'hash-1','idem-1','verified','verified');

UPDATE form_submissions SET import_status='accepted' WHERE id='00000000-0000-0000-0000-000000000020';

DO $$ BEGIN
  IF (SELECT import_status FROM form_submissions WHERE id='00000000-0000-0000-0000-000000000020') <> 'accepted' THEN
    RAISE EXCEPTION 'expected accepted workflow state';
  END IF;
END $$;

DO $$ BEGIN
  BEGIN
    UPDATE form_submissions SET payload_ciphertext=decode('02','hex') WHERE id='00000000-0000-0000-0000-000000000020';
    RAISE EXCEPTION 'expected immutable payload violation';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
END $$;

INSERT INTO audit_events (id,request_id,actor_user_id,actor_role,action,resource_type,decision,reason_code)
VALUES ('00000000-0000-0000-0000-000000000030','req_synthetic','00000000-0000-0000-0000-000000000001','consultant','test','submission','SUCCESS','SYNTHETIC_TEST');
DO $$ BEGIN
  BEGIN
    UPDATE audit_events SET reason_code='CHANGED' WHERE id='00000000-0000-0000-0000-000000000030';
    RAISE EXCEPTION 'expected immutable audit violation';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
END $$;

ROLLBACK;
SELECT 'DATABASE_INVARIANTS_OK' AS result;
