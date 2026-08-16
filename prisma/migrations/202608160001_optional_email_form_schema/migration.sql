-- Google Forms appends a newly added question to the linked response sheet.
-- The new email answer is optional and remains inside the encrypted immutable payload.
ALTER TYPE form_schema_id ADD VALUE IF NOT EXISTS 'forms_v3_77_columns';
