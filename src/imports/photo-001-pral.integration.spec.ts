import{readFileSync}from'node:fs';import{resolve}from'node:path';import{describe,expect,it}from'vitest';
// @ts-expect-error Production catalog helper is intentionally plain ESM.
import{buildFoodMineralProfile}from'../../scripts/lib/food-mineral-profile.mjs';
import{calculatePral}from'./pral.calculator';
const read=(path:string)=>JSON.parse(readFileSync(resolve(process.cwd(),path),'utf8'));
const fixture=read('test/fixtures/photo-001-diary.json'),source=read('data/food-catalog/photo-payload.json');
const products=new Map(source.products.map((p:any)=>[/^\d{2}-\d{3}$/.test(p.cofid_code??'')?p.cofid_code:p.product_id,p]));
const portions=fixture.items.map((x:any)=>({foodKey:x.cofidCode??x.localKey,massG:x.massG}));
const cards=fixture.items.map((x:any)=>{const key=x.cofidCode??x.localKey,p:any=products.get(key);if(!p)throw new Error(`PHOTO_001_PRAL_MAPPING_MISSING:${key}`);return{foodKey:key,displayName:p.name_ru,proteinPer100g:p.protein_g,minerals:buildFoodMineralProfile(p)};});
describe('PHOTO-001 PRAL path',()=>{it('reproduces the Remer–Manz control result',()=>{const result=calculatePral(portions,cards);expect(result.pralMeqPerDay).toBe(28.7);expect(result.qualityGate.status).toBe('passed');expect(result.interpretation).toBe('acidifying');});});
