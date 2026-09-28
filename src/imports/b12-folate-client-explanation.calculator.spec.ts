import {describe,expect,it} from 'vitest';
import {calculateB12FolateClientExplanation} from './b12-folate-client-explanation.calculator';

describe('B12 and folate client explanation',()=>{
  it('creates a short neutral draft from reliable comparisons',()=>{const value=calculateB12FolateClientExplanation({vitamin_b12:{status:'working_target_met',completeness:{sufficient:true}},folate:{status:'below_working_target',completeness:{sufficient:true}}});expect(value.summary).toContain('витамина B12');expect(value.points).toEqual([expect.stringContaining('фолата')]);});
  it('does not expose labels, technical gates, disclaimers, deficiency claims, or directives',()=>{const value=calculateB12FolateClientExplanation({vitamin_b12:{status:'working_target_met',completeness:{sufficient:true}},folate:{status:'below_working_target',completeness:{sufficient:true}}}),text=JSON.stringify(value).toLowerCase();for(const forbidden of ['этикет','обогащ','шлюз','лаборатор','диагноз','назнач','дефицит','вам нужно','следует','рекомендуем','дозиров'])expect(text).not.toContain(forbidden);expect(value.disclaimer).toBe('');});
  it('withholds unreliable comparisons',()=>{const value=calculateB12FolateClientExplanation({vitamin_b12:{status:'insufficient_data',completeness:{sufficient:false}},folate:null});expect(value.summary).toContain('надёжное сравнение');expect(value.points).toEqual([]);});
});
