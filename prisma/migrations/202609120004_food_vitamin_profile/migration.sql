ALTER TABLE "food_product_cards" ADD COLUMN "vitamin_profile" JSONB;
COMMENT ON COLUMN "food_product_cards"."vitamin_profile" IS 'Versioned naturally occurring food vitamin values; fortification additions remain separate in enrichment_profile.';
