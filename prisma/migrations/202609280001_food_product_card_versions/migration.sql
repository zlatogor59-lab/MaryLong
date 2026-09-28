CREATE TABLE "food_product_card_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "card_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "change_kind" TEXT NOT NULL,
  "changed_by" UUID,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "food_product_card_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "food_product_card_versions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "food_product_cards"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "food_product_card_versions_card_id_version_key" ON "food_product_card_versions"("card_id", "version");
CREATE INDEX "food_product_card_versions_card_id_created_at_idx" ON "food_product_card_versions"("card_id", "created_at");

INSERT INTO "food_product_card_versions" ("card_id", "version", "change_kind", "changed_by", "snapshot", "created_at")
SELECT id, version, 'BACKFILL', COALESCE(verified_by, created_by), jsonb_build_object(
  'canonicalName', canonical_name,
  'proteinPer100g', protein_per_100g,
  'energyKcalPer100g', energy_kcal_per_100g,
  'carbohydratePer100g', carbohydrate_per_100g,
  'fibrePer100g', fibre_per_100g,
  'totalFatPer100g', total_fat_per_100g,
  'origin', origin,
  'plantSharePercent', plant_share_percent,
  'sourceLabel', source_label,
  'sourceReference', source_reference,
  'mineralProfile', mineral_profile,
  'vitaminProfile', vitamin_profile,
  'enrichmentProfile', enrichment_profile,
  'status', status,
  'replacementCardId', replacement_card_id,
  'verifiedBy', verified_by,
  'verifiedAt', verified_at
), updated_at
FROM "food_product_cards";

CREATE FUNCTION prevent_food_product_card_version_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'food product card versions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "food_product_card_versions_no_update"
BEFORE UPDATE ON "food_product_card_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_food_product_card_version_update();
