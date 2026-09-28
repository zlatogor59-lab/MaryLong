CREATE FUNCTION normalize_food_product_card_version() RETURNS trigger AS $$
BEGIN
  IF NEW.version = OLD.version THEN
    NEW.version := OLD.version + 1;
  ELSIF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'food product card version must advance by exactly one';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION capture_food_product_card_version() RETURNS trigger AS $$
DECLARE
  configured_kind TEXT;
  configured_actor TEXT;
BEGIN
  configured_kind := NULLIF(current_setting('app.food_product_change_kind', true), '');
  configured_actor := NULLIF(current_setting('app.food_product_changed_by', true), '');
  INSERT INTO food_product_card_versions(card_id, version, change_kind, changed_by, snapshot, created_at)
  VALUES (
    NEW.id,
    NEW.version,
    COALESCE(configured_kind, CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'SYNC' END),
    COALESCE(configured_actor::uuid, NEW.verified_by, NEW.created_by),
    jsonb_build_object(
      'canonicalName', NEW.canonical_name,
      'proteinPer100g', NEW.protein_per_100g,
      'energyKcalPer100g', NEW.energy_kcal_per_100g,
      'carbohydratePer100g', NEW.carbohydrate_per_100g,
      'fibrePer100g', NEW.fibre_per_100g,
      'totalFatPer100g', NEW.total_fat_per_100g,
      'origin', NEW.origin,
      'plantSharePercent', NEW.plant_share_percent,
      'sourceLabel', NEW.source_label,
      'sourceReference', NEW.source_reference,
      'mineralProfile', NEW.mineral_profile,
      'vitaminProfile', NEW.vitamin_profile,
      'enrichmentProfile', NEW.enrichment_profile,
      'status', NEW.status,
      'replacementCardId', NEW.replacement_card_id,
      'verifiedBy', NEW.verified_by,
      'verifiedAt', NEW.verified_at
    ),
    NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER food_product_cards_normalize_version
BEFORE UPDATE ON food_product_cards
FOR EACH ROW EXECUTE FUNCTION normalize_food_product_card_version();

CREATE TRIGGER food_product_cards_capture_version
AFTER INSERT OR UPDATE ON food_product_cards
FOR EACH ROW EXECUTE FUNCTION capture_food_product_card_version();
