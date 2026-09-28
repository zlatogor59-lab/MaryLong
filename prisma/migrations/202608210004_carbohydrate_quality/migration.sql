ALTER TABLE "food_product_cards"
  ADD COLUMN "fibre_per_100g" DECIMAL(7,3),
  ADD COLUMN "total_sugars_per_100g" DECIMAL(7,3),
  ADD COLUMN "free_sugars_per_100g" DECIMAL(7,3),
  ADD COLUMN "carbohydrate_source_class" TEXT,
  ADD COLUMN "carbohydrate_quality_source" TEXT;
