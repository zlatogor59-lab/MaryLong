import{describe,expect,it}from'vitest';
// @ts-expect-error Production catalog helper is intentionally plain ESM.
import{buildFoodVitaminProfile,sameFoodVitaminProfile}from'../../scripts/lib/food-vitamin-profile.mjs';
const product={product_id:'COFID-12-962',cofid_code:'12-962',name_ru:'Яйца',description_source:'Calculated from raw eggs',source:'CoFID 2021',vitamin_d_ug:4,trace_fields:'',missing_fields:''};
describe('food vitamin profile import',()=>{
 it('keeps vitamin D value, unit and provenance',()=>expect(buildFoodVitaminProfile(product)).toMatchObject({vitamin_d:{valuePer100g:4,unit:'ug',status:'calculated',sourceVersion:'CoFID 2021',sourceRecord:'12-962'}}));
 it('keeps B12 and folate in the same profile',()=>expect(buildFoodVitaminProfile({...product,b12_ug:2.1,b9_ug:47})).toMatchObject({vitamin_b12:{valuePer100g:2.1,unit:'ug'},folate:{valuePer100g:47,unit:'ug'}}));
 it('keeps vitamin C in milligrams',()=>expect(buildFoodVitaminProfile({...product,vitamin_c_mg:29})).toMatchObject({vitamin_c:{valuePer100g:29,unit:'mg'}}));
 it('keeps vitamin A in micrograms of retinol equivalents',()=>expect(buildFoodVitaminProfile({...product,vitamin_a_ug_re:260})).toMatchObject({vitamin_a:{valuePer100g:260,unit:'ug_re'}}));
 it('keeps vitamin E in CoFID milligrams of alpha-tocopherol equivalents',()=>expect(buildFoodVitaminProfile({...product,vitamin_e_mg_te:1.64})).toMatchObject({vitamin_e:{valuePer100g:1.64,unit:'mg_alpha_te'}}));
 it('keeps vitamin B1 in CoFID milligrams',()=>expect(buildFoodVitaminProfile({...product,b1_mg:.12})).toMatchObject({vitamin_b1:{valuePer100g:.12,unit:'mg'}}));
 it('keeps vitamin B2 in CoFID milligrams',()=>expect(buildFoodVitaminProfile({...product,b2_mg:.14})).toMatchObject({vitamin_b2:{valuePer100g:.14,unit:'mg'}}));
 it('keeps vitamin B5 in CoFID milligrams',()=>expect(buildFoodVitaminProfile({...product,b5_mg:.34})).toMatchObject({vitamin_b5:{valuePer100g:.34,unit:'mg'}}));
 it('keeps vitamin B7 in CoFID micrograms',()=>expect(buildFoodVitaminProfile({...product,b7_ug:4.2})).toMatchObject({vitamin_b7:{valuePer100g:4.2,unit:'ug'}}));
 it('preserves trace separately from measured zero',()=>expect(buildFoodVitaminProfile({...product,vitamin_d_ug:0,trace_fields:'vitamin_d_ug'}).vitamin_d).toMatchObject({valuePer100g:null,status:'trace'}));
 it('preserves missing separately from zero',()=>expect(buildFoodVitaminProfile({...product,vitamin_d_ug:null,missing_fields:'vitamin_d_ug'}).vitamin_d).toMatchObject({valuePer100g:null,status:'missing'}));
 it('marks documented proxies as borrowed',()=>expect(buildFoodVitaminProfile({...product,name_ru:'Сельдь (прокси для другой сельди)',description_source:''}).vitamin_d.status).toBe('borrowed'));
 it('compares profiles independently of key order',()=>expect(sameFoodVitaminProfile({vitamin_d:{unit:'ug',status:'trace'}},{vitamin_d:{status:'trace',unit:'ug'}})).toBe(true));
});
