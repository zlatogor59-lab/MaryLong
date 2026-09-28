ALTER TABLE "food_product_cards"
  ADD COLUMN "mineral_profile" JSONB;

COMMENT ON COLUMN "food_product_cards"."mineral_profile" IS
  'Versioned Mg/Fe/Zn/Cu values with unit, value status and source provenance; missing is never treated as zero.';
