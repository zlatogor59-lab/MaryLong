import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

describe('food product replacement continuity',()=>{
  it('keeps historical product ids resolvable without rewriting encrypted intake history',()=>{const source=readFileSync(resolve(__dirname,'food-product.repository.ts'),'utf8');expect(source).toContain('COALESCE(requested.replacement_card_id,requested.id)');expect(source).toContain('resolved.status=\'verified\'');});
  it('requires a retired duplicate and prevents a self replacement in the database',()=>{const migration=readFileSync(resolve(__dirname,'../../prisma/migrations/202609270003_food_product_replacements/migration.sql'),'utf8');expect(migration).toContain("replacement_card_id IS NULL OR status = 'retired'");expect(migration).toContain('replacement_card_id <> id');});
});
