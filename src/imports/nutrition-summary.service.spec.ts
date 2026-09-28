import{describe,expect,it}from'vitest';import{NutritionSummaryService}from'./nutrition-summary.service';
describe('nutrition summary service',()=>{it('combines modules without product-level fields',async()=>{const empty={get:async()=>({assessment:null})},service=new NutritionSummaryService(
 {get:async()=>({version:1,summary:{completeness_percent:100,range_status:'within_range',plant_share_status:'meets_guide'},processed_meat:{status:'not_present'},client_approval:{status:'approved'},items:[{product:'hidden'}]})}as never,
 {get:async()=>({source_intake_version:1,summary:{fat_balance:{status:'within_range'},completeness:{totalFatPer100g:100},signals:{}},client_approval:{status:'draft'}})}as never,
 {get:async()=>({source_intake_version:1,summary:{data_status:'reliable',signals:{carbohydrate:'within_reference_range'}},client_publication_status:'draft'})}as never,
 empty as never,empty as never,empty as never,empty as never,
 {get:async()=>({sections:[{key:'goals',fields:[{key:'main_goal',value:'Поддержание веса'}]}]})}as never,
 {read:async()=>({status:'automatic',version:0,selected_keys:[],reason:'',updated_at:null})}as never,
 {read:async()=>({status:'draft',source_status:'current',version:0,editorial:{},deviates_from_automatic:false,updated_at:null})}as never);
 const out=await service.get('s','c',{}as never);expect(out.modules).toHaveLength(9);expect(JSON.stringify(out)).not.toContain('hidden');expect(out.priority_review.status).toBe('automatic');});});
