ALTER TABLE client_mineral_targets
  ADD COLUMN manganese_target_mg numeric(9,3);

ALTER TABLE client_mineral_targets
  ADD CONSTRAINT manganese_target_positive CHECK (manganese_target_mg IS NULL OR manganese_target_mg > 0);
