ALTER TABLE client_mineral_targets
  ADD COLUMN molybdenum_target_ug numeric(12,3);

ALTER TABLE client_mineral_targets
  ADD CONSTRAINT molybdenum_target_positive CHECK (molybdenum_target_ug IS NULL OR molybdenum_target_ug > 0);
