import {createClientNutrientExplanation} from './nutrient-client-publication';

type Assessment={status:string;decisionBlockedByUncertainty?:boolean;completeness?:{sufficient:boolean}}|null;
const names:Record<string,string>={magnesium:'магния',iron:'железа',zinc:'цинка',copper:'меди',manganese:'марганца',molybdenum:'молибдена',selenium:'селена',iodine:'йода'};

export function calculateMineralClientExplanation(assessments:Record<string,Assessment>){
  const points:string[]=[];let excluded=0;
  for(const [nutrient,value] of Object.entries(assessments)){
    const blocked=!value||value.decisionBlockedByUncertainty||value.completeness?.sufficient===false||value.status==='insufficient_data'||value.status==='not_assessed';
    if(blocked){excluded++;continue;}
    if(value.status==='markedly_below_target')points.push(`Расчётное поступление ${names[nutrient]} в заполненном рационе существенно ниже используемого рабочего ориентира.`);
    if(value.status==='below_target')points.push(`Расчётное поступление ${names[nutrient]} в заполненном рационе ниже используемого рабочего ориентира.`);
    if(value.status==='close_to_target')points.push(`Расчётное поступление ${names[nutrient]} близко к используемому рабочему ориентиру.`);
    if(value.status==='target_met_or_above')points.push(`Расчётное поступление ${names[nutrient]} достигает используемого рабочего ориентира.`);
    if(value.status==='above_upper_level_estimate')points.push(`Расчётная оценка поступления ${names[nutrient]} выше применимого верхнего уровня и требует отдельной проверки консультантом.`);
  }
  if(excluded)points.push('Часть минералов не включена в вывод: исходных данных недостаточно для надёжного сравнения.');
  return createClientNutrientExplanation({title:'Что показал анализ минералов',summary:points[0]??'По доступным данным надёжное сравнение с рабочими ориентирами пока невозможно.',points:points.slice(1),next_step:'Обсудите результат с консультантом вместе с обычным рационом, добавками и остальными разделами питания.',disclaimer:''});
}

export function isMineralExplanationApprovalCurrent(approval:any,sourceIntakeVersion:number,targetVersion:number,explanationHash:string){return Boolean(approval&&approval.sourceIntakeVersion===sourceIntakeVersion&&approval.targetVersion===targetVersion&&approval.explanationHash===explanationHash);}
