import {createClientNutrientExplanation} from './nutrient-client-publication';
export function calculateFatClientExplanation(c:any){
  const points:string[]=[];
  const balance=c.fatBalance?.status;
  if(balance==='below_range')points.push('Количество жиров в заполненном рационе ниже индивидуального ориентировочного диапазона.');
  if(balance==='within_range')points.push('Количество жиров в заполненном рационе находится в индивидуальном ориентировочном диапазоне.');
  if(balance==='above_range')points.push('Количество жиров в заполненном рационе выше индивидуального ориентировочного диапазона.');
  if(balance==='target_not_set')points.push('Индивидуальный ориентир по общему количеству жиров пока не задан.');
  if(balance==='insufficient_data')points.push('Для оценки общего количества жиров недостаточно данных.');
  if(c.signals.saturated==='red_flag')points.push('Доля насыщенных жирных кислот выше используемого ориентира.');
  if(c.signals.trans==='red_flag')points.push('Доля трансжиров выше используемого ориентира.');
  if(c.signals.omega3Ala==='below_guide'||c.signals.epaDha==='below_guide')points.push('По заполненным данным поступление некоторых омега‑3 жирных кислот ниже используемых ориентиров.');
  if(c.signals.palmitic==='research_attention')points.push('Состав жиров содержит показатель, который консультанту следует рассмотреть в общем контексте рациона.');
  if(Object.values(c.completeness||{}).some(v=>typeof v==='number'&&v<100))points.push('Часть показателей рассчитана по неполным данным о составе продуктов.');
  return createClientNutrientExplanation({title:'Что показал анализ жиров',summary:points.length?points[0]:'По заполненным данным выраженного отклонения в этом разделе не выявлено.',points:points.slice(1),next_step:'Обсудите результат с консультантом вместе с остальными разделами питания.',disclaimer:''});
}
export function isFatExplanationApprovalCurrent(approval:any,sourceIntakeVersion:number,targetVersion:number,explanationHash:string){return Boolean(approval&&approval.sourceIntakeVersion===sourceIntakeVersion&&approval.targetVersion===targetVersion&&approval.explanationHash===explanationHash);}
