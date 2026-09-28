import{describe,expect,it}from'vitest';
import{AuthorizationPolicy}from'../authorization/authorization.policy';
import{NutrientClientPublicationService}from'./nutrient-client-publication.service';
const client:any={id:'c',role:'client',status:'active'};
const explanation={title:'Белок',summary:'Есть отклонение.',points:[],next_step:'Обсудите.',disclaimer:'Не план питания.'};
const versions=(over:any)=>over.stale?{intake_version:3,target_version:1}:{intake_version:2,target_version:1};
const setup=(over:any={})=>new NutrientClientPublicationService(new AuthorizationPolicy(),{clientScope:async()=>over.scope===false?null:'client-id',find:async()=>over.record===false?null:{sourceIntakeVersion:2,targetVersion:1,explanationCiphertext:Buffer.from(JSON.stringify(explanation)),approvedAt:new Date('2026-01-01'),version:1},currentVersions:async()=>versions(over),currentFoodIntakeVersion:async()=>versions(over)}as never,{decrypt:async(v:any)=>v}as never);
describe('client nutrient publication',()=>{
  it('returns only approved explanation fields',async()=>{const out=await setup().get('s','protein',client);expect(out).toMatchObject({nutrient_key:'protein',explanation});expect(JSON.stringify(out)).not.toContain('product');});
  it('returns a summary made only from all approved client payloads',async()=>{const out=await setup().getSummary('s',client);expect(out.items).toHaveLength(16);expect(out.items.map((x:any)=>x.nutrient_key)).toEqual(['protein','fat','carbohydrate','minerals','vitamin_d','b12_folate','vitamin_c','vitamin_a','vitamin_e','vitamin_b1','vitamin_b2','vitamin_b3','vitamin_b5','vitamin_b6','vitamin_b7','vitamin_k']);expect(JSON.stringify(out)).not.toContain('recommendation');});
  it('blocks stale approval',async()=>await expect(setup({stale:true}).get('s','protein',client)).rejects.toThrow('RESOURCE_UNAVAILABLE'));
  it('blocks another client',async()=>await expect(setup({scope:false}).get('s','protein',client)).rejects.toThrow('RESOURCE_UNAVAILABLE'));
});
