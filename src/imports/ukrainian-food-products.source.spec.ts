import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const source=JSON.parse(readFileSync(resolve(process.cwd(),'docs/ukrainian-food-products-priority-v1.json'),'utf8'));

describe('Ukrainian priority food source',()=>{
  it('contains four unique, usable verified-card candidates',()=>{
    expect(source.products).toHaveLength(4);
    expect(new Set(source.products.map((product:any)=>product.name)).size).toBe(4);
    for(const product of source.products){
      expect(product.proteinPer100g).toBeGreaterThanOrEqual(0);
      expect(product.energyKcalPer100g).toBeGreaterThan(0);
      expect(product.totalFatPer100g).toBeGreaterThanOrEqual(0);
      expect(product.carbohydratePer100g).toBeGreaterThanOrEqual(0);
      expect(product.sourceLabel).toMatch(/CoFID 2021|USDA FoodData Central SR Legacy/);
    }
  });

  it('keeps missing micronutrients explicit instead of replacing them with zero',()=>{
    for(const product of source.products){
      for(const value of [...Object.values(product.mineralProfile),...Object.values(product.vitaminProfile)] as any[]){
        if(value.status==='missing')expect(value.valuePer100g).toBeNull();
        else if(value.status==='trace')expect([null,0]).toContain(value.valuePer100g);
        else expect(value.valuePer100g).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('preserves exact preparation in the product names',()=>{
    expect(source.products.map((product:any)=>product.name)).toEqual(expect.arrayContaining([
      'Куриное бедро без кожи, тушёное',
      'Хек, гриль без добавленного жира',
      'Хлеб ржаной',
      'Куриная печень, варёная/тушёная',
    ]));
  });
});
