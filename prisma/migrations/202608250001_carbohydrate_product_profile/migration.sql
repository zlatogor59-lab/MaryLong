ALTER TABLE "food_product_cards"
  ADD COLUMN "starch_per_100g" DECIMAL(7,3),
  ADD COLUMN "polyols_per_100g" DECIMAL(7,3),
  ADD COLUMN "resistant_starch_per_100g" DECIMAL(7,3),
  ADD COLUMN "sugar_origin_class" TEXT,
  ADD COLUMN "carbohydrate_food_group" TEXT,
  ADD COLUMN "food_matrix_class" TEXT,
  ADD COLUMN "processing_class" TEXT,
  ADD COLUMN "carbohydrate_flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "carbohydrate_data_reliability" TEXT;

COMMENT ON COLUMN "food_product_cards"."sugar_origin_class" IS 'Independent origin classification; unknown is not zero free sugars.';
COMMENT ON COLUMN "food_product_cards"."food_matrix_class" IS 'Physical food structure, evaluated separately from carbohydrate chemistry.';
COMMENT ON COLUMN "food_product_cards"."processing_class" IS 'Product processing descriptor, evaluated separately from carbohydrate chemistry.';
