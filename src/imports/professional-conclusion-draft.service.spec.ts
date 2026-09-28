import{describe,expect,it,vi}from'vitest';
import{ProfessionalConclusionDraftService}from'./professional-conclusion-draft.service';

const editorial={priority_interpretation:'Профессиональная интерпретация.',supporting_interpretation:'',follow_up_questions:'',final_note:'',deviation_reason:''};
const conclusion=(readiness:string)=>({sections:[{key:'readiness',content:{status:readiness}}]});
const service=(save=vi.fn(async(input:any)=>({id:'d',...input,version:1,updatedAt:new Date('2026-09-26T00:00:00Z')})))=>new ProfessionalConclusionDraftService({find:async()=>null,save}as never,{encrypt:async(x:Uint8Array)=>x,decrypt:async(x:Uint8Array)=>x}as never);

describe('professional conclusion draft scenarios',()=>{
  it('blocks ready while the generated conclusion has data blockers',async()=>{await expect(service().save('s','c',{id:'u'}as never,'r',0,{status:'ready',deviates_from_automatic:false,editorial},conclusion('data_review_required'))).rejects.toMatchObject({code:'PROFESSIONAL_CONCLUSION_NOT_READY'});});
  it('blocks ready while a manual priority decision is stale',async()=>{await expect(service().save('s','c',{id:'u'}as never,'r',0,{status:'ready',deviates_from_automatic:false,editorial},conclusion('priority_review_required'))).rejects.toMatchObject({code:'PROFESSIONAL_CONCLUSION_NOT_READY'});});
  it('requires professional interpretation before ready',async()=>{await expect(service().save('s','c',{id:'u'}as never,'r',0,{status:'ready',deviates_from_automatic:false,editorial:{...editorial,priority_interpretation:''}},conclusion('ready_for_consultant_review'))).rejects.toMatchObject({code:'PROFESSIONAL_CONCLUSION_NOT_READY'});});
  it('requires a recorded reason when the consultant deviates',async()=>{await expect(service().save('s','c',{id:'u'}as never,'r',0,{status:'draft',deviates_from_automatic:true,editorial},conclusion('ready_for_consultant_review'))).rejects.toMatchObject({code:'PROFESSIONAL_CONCLUSION_INVALID'});});
  it('allows ready only after review and records the consultant text',async()=>{const save=vi.fn(async(input:any)=>({id:'d',...input,version:1,updatedAt:new Date('2026-09-26T00:00:00Z')}));const out=await service(save).save('s','c',{id:'u'}as never,'r',0,{status:'ready',deviates_from_automatic:false,editorial},conclusion('ready_for_consultant_review'));expect(out).toMatchObject({status:'ready',version:1,editorial:{priority_interpretation:'Профессиональная интерпретация.'}});expect(save).toHaveBeenCalledOnce();});
});
