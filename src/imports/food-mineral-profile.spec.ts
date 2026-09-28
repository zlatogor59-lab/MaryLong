import {describe,expect,it} from 'vitest';
// @ts-expect-error Production catalog helper is intentionally plain ESM.
import {buildFoodMineralProfile,sameFoodMineralProfile} from '../../scripts/lib/food-mineral-profile.mjs';

const product={product_id:'COFID-12-962',cofid_code:'12-962',name_ru:'Яйца',description_source:'Calculated from raw eggs',source:'CoFID 2021',magnesium_mg:16,iron_mg:2.18,zinc_mg:1.4,manganese_mg:0.04,sodium_mg:195,potassium_mg:184,trace_fields:'',missing_fields:''};
describe('food mineral profile import',()=>{
  it('keeps value, unit, provenance and calculated status',()=>expect(buildFoodMineralProfile(product)).toMatchObject({magnesium:{valuePer100g:16,unit:'mg',status:'calculated',sourceVersion:'CoFID 2021',sourceRecord:'12-962'},copper:{valuePer100g:null,unit:'ug',status:'missing'}}));
  it('keeps sodium and potassium in the same versioned food profile',()=>expect(buildFoodMineralProfile(product)).toMatchObject({sodium:{valuePer100g:195,unit:'mg'},potassium:{valuePer100g:184,unit:'mg'}}));
  it('keeps manganese in milligrams with provenance',()=>expect(buildFoodMineralProfile(product).manganese).toMatchObject({valuePer100g:.04,unit:'mg',sourceVersion:'CoFID 2021',sourceRecord:'12-962'}));
  it('keeps molybdenum missing unless an exact supported fallback exists',()=>expect(buildFoodMineralProfile(product).molybdenum).toMatchObject({valuePer100g:null,unit:'ug',status:'missing'}));
  it('uses the documented FDC cucumber fallback with explicit borrowed status',()=>expect(buildFoodMineralProfile({...product,product_id:'COFID-13-523'}).molybdenum).toMatchObject({valuePer100g:3.723,unit:'ug',status:'borrowed',sourceRecord:'FDC 2346406'}));
  it('preserves trace as trace rather than measured zero',()=>expect(buildFoodMineralProfile({...product,iron_mg:0,trace_fields:'iron_mg'}).iron).toMatchObject({valuePer100g:null,status:'trace'}));
  it('preserves a missing source value as missing',()=>expect(buildFoodMineralProfile({...product,zinc_mg:null,missing_fields:'zinc_mg'}).zinc).toMatchObject({valuePer100g:null,status:'missing'}));
  it('marks a documented proxy as borrowed',()=>expect(buildFoodMineralProfile({...product,name_ru:'Салат (прокси для айсберга)',description_source:''}).magnesium.status).toBe('borrowed'));
  it('compares JSONB profiles independently of object key order',()=>expect(sameFoodMineralProfile({iron:{status:'trace',unit:'mg'}},{iron:{unit:'mg',status:'trace'}})).toBe(true));
  it('ignores harmless JSONB decimal normalization',()=>expect(sameFoodMineralProfile({potassium:{valuePer100g:156.42105263157896}},{potassium:{valuePer100g:156.421052631579}})).toBe(true));
});
