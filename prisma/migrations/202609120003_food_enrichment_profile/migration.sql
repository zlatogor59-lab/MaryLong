ALTER TABLE "food_product_cards"
  ADD COLUMN "enrichment_profile" JSONB;

COMMENT ON COLUMN "food_product_cards"."enrichment_profile" IS
  'Versioned product fortification evidence. Generic or invalid profiles resolve to unknown and added nutrients are never inferred.';
