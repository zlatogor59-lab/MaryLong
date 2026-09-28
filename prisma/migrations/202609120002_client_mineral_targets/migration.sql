CREATE TABLE client_mineral_targets (
  client_id uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  magnesium_target_mg numeric(9,3),
  iron_target_mg numeric(9,3),
  zinc_target_mg numeric(9,3),
  copper_target_ug numeric(12,3),
  selenium_target_ug numeric(12,3),
  selenium_upper_level_ug numeric(12,3),
  iodine_target_ug numeric(12,3),
  iodine_upper_level_ug numeric(12,3),
  updated_by uuid NOT NULL REFERENCES users(id),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_mineral_targets_positive CHECK (
    (magnesium_target_mg IS NULL OR magnesium_target_mg > 0) AND
    (iron_target_mg IS NULL OR iron_target_mg > 0) AND
    (zinc_target_mg IS NULL OR zinc_target_mg > 0) AND
    (copper_target_ug IS NULL OR copper_target_ug > 0) AND
    (selenium_target_ug IS NULL OR selenium_target_ug > 0) AND
    (selenium_upper_level_ug IS NULL OR selenium_upper_level_ug > 0) AND
    (iodine_target_ug IS NULL OR iodine_target_ug > 0) AND
    (iodine_upper_level_ug IS NULL OR iodine_upper_level_ug > 0)
  ),
  CONSTRAINT selenium_upper_above_target CHECK (selenium_target_ug IS NULL OR selenium_upper_level_ug IS NULL OR selenium_upper_level_ug > selenium_target_ug),
  CONSTRAINT iodine_upper_above_target CHECK (iodine_target_ug IS NULL OR iodine_upper_level_ug IS NULL OR iodine_upper_level_ug > iodine_target_ug)
);
