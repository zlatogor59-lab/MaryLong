ALTER TABLE food_product_cards
  ADD COLUMN replacement_card_id uuid REFERENCES food_product_cards(id);

ALTER TABLE food_product_cards
  ADD CONSTRAINT food_product_replacement_not_self CHECK (replacement_card_id IS NULL OR replacement_card_id <> id),
  ADD CONSTRAINT food_product_replacement_requires_retired CHECK (replacement_card_id IS NULL OR status = 'retired');

CREATE INDEX food_product_cards_replacement_idx
  ON food_product_cards(replacement_card_id)
  WHERE replacement_card_id IS NOT NULL;

COMMENT ON COLUMN food_product_cards.replacement_card_id IS
  'Verified canonical card that transparently replaces this retired duplicate in historical intake payloads.';
