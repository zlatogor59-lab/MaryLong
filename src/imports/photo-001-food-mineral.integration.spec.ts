import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {calculateFoodMineralIntake,type FoodMineralKey,type MineralUnit} from './food-mineral-intake.calculator';
import {calculateSodiumPotassium} from './sodium-potassium.calculator';
// @ts-expect-error Production catalog helper is intentionally plain ESM.
import {buildFoodMineralProfile} from '../../scripts/lib/food-mineral-profile.mjs';

const read=(path:string)=>JSON.parse(readFileSync(resolve(process.cwd(),path),'utf8'));
const fixture=read('test/fixtures/photo-001-diary.json'),source=read('../tmp/fooddata-research/photo-payload.json');
const products=new Map(source.products.map((product:any)=>[/^\d{2}-\d{3}$/.test(product.cofid_code??'')?product.cofid_code:product.product_id,product]));
const cards=fixture.items.map((item:any)=>{const key=item.cofidCode??item.localKey,product=products.get(key) as any;if(!product)throw new Error(`PHOTO_001_MINERAL_MAPPING_MISSING:${key}`);return{foodKey:key,displayName:product.name_ru,nutrients:buildFoodMineralProfile(product)};});
const portions=fixture.items.map((item:any)=>({foodKey:item.cofidCode??item.localKey,grossMassG:item.massG}));
const calculate=(nutrient:FoodMineralKey,target:number,unit:MineralUnit='mg')=>calculateFoodMineralIntake(nutrient,portions,cards,{value:target,unit});

describe('PHOTO-001 food mineral path',()=>{
  it('reproduces the documented calcium and phosphorus totals',()=>{
    const calcium=calculate('calcium',1000),phosphorus=calculate('phosphorus',700);
    expect(calcium.total).toBeCloseTo(756.21,1);expect(phosphorus.total).toBeCloseTo(1293.7,1);
    expect(calcium.completeness.sufficient).toBe(true);expect(phosphorus.completeness.sufficient).toBe(true);
  });
  it('reproduces the documented magnesium, iron and zinc food totals',()=>{
    const magnesium=calculate('magnesium',500),iron=calculate('iron',17),zinc=calculate('zinc',12);
    expect(magnesium.total).toBeCloseTo(205.1,1);expect(iron.total).toBeCloseTo(10.22,1);expect(zinc.total).toBeCloseTo(13.44,1);
    expect([magnesium,iron,zinc].every(result=>result.completeness.sufficient)).toBe(true);
    expect(magnesium.status).toBe('markedly_below_target');expect(iron.status).toBe('markedly_below_target');expect(zinc.status).toBe('target_met_or_above');
  });
  it('keeps copper incomplete instead of manufacturing a zero total',()=>{
    const copper=calculate('copper',900,'ug');expect(copper.lines).toHaveLength(0);expect(copper.unresolved).toHaveLength(19);expect(copper.status).toBe('insufficient_data');expect(copper.percentOfTarget).toBeNull();expect(copper.knownTotalIsLowerEstimate).toBe(true);
  });
  it('calculates manganese from CoFID while preserving the one missing food value',()=>{
    const manganese=calculate('manganese',3);
    expect(manganese.total).toBeCloseTo(1.373,2);
    expect(manganese.completeness.massCoveragePercent).toBeGreaterThan(97);
    expect(manganese.completeness.sufficient).toBe(true);
    expect(manganese.knownTotalIsLowerEstimate).toBe(true);
    expect(manganese.status).toBe('markedly_below_target');
  });
  it('keeps molybdenum blocked when only the exact cucumber fallback is available',()=>{
    const molybdenum=calculate('molybdenum',45,'ug');
    expect(molybdenum.total).toBeCloseTo(1.862,2);
    expect(molybdenum.lines).toHaveLength(1);
    expect(molybdenum.completeness.massCoveragePercent).toBeLessThan(3);
    expect(molybdenum.completeness.sufficient).toBe(false);
    expect(molybdenum.status).toBe('insufficient_data');
    expect(molybdenum.percentOfTarget).toBeNull();
  });
  it('calculates traditional-food sodium and potassium while preserving unknown added salt',()=>{
    const sodium=calculate('sodium',2000),potassium=calculate('potassium',3500);
    expect(sodium.total).toBeCloseTo(1441.7,1);expect(potassium.total).toBeCloseTo(2938.5,1);
    expect(sodium.completeness.sufficient).toBe(true);expect(potassium.completeness.sufficient).toBe(true);
    const combined=calculateSodiumPotassium({sodiumMg:sodium.total,sodiumCoverageSufficient:true,addedSaltUnknown:true,potassiumMg:{low:potassium.total,high:potassium.total},potassiumCoverageSufficient:true});
    expect(combined.sodium).toMatchObject({status:'lower_bound',knownTotalIsLowerEstimate:true});
    expect(combined.potassium.status).toBe('below_target');
    expect(combined.priority).toBe('potassium_below_target');
  });
});
