import {createClientNutrientExplanation} from './nutrient-client-publication';

type Assessment={status:string;completeness?:{sufficient:boolean}}|null;

const sentence=(name:string,value:Assessment)=>{
  if(!value||value.completeness?.sufficient===false||value.status==='insufficient_data'||value.status==='not_assessed')return null;
  if(value.status==='below_working_target')return `Расчётное поступление ${name} в заполненном рационе ниже используемого рабочего ориентира.`;
  if(value.status==='working_target_met')return `Расчётное поступление ${name} в заполненном рационе достигает используемого рабочего ориентира.`;
  return null;
};

export function calculateB12FolateClientExplanation(assessments:{vitamin_b12:Assessment;folate:Assessment}){
  const points=[sentence('витамина B12',assessments.vitamin_b12),sentence('фолата',assessments.folate)].filter((value):value is string=>Boolean(value));
  return createClientNutrientExplanation({
    title:'Что показал анализ витаминов B12 и фолата',
    summary:points[0]??'По доступным данным надёжное сравнение с рабочими ориентирами пока невозможно.',
    points:points.slice(1),
    next_step:'Обсудите результат с консультантом вместе с обычным рационом, добавками и остальными разделами питания.',
    disclaimer:'',
  });
}

export function isB12FolateExplanationApprovalCurrent(approval:any,sourceIntakeVersion:number,explanationHash:string){return Boolean(approval&&approval.sourceIntakeVersion===sourceIntakeVersion&&approval.targetVersion===0&&approval.explanationHash===explanationHash);}
