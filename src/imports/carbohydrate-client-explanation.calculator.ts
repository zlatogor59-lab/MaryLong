import {createClientNutrientExplanation} from './nutrient-client-publication';
export function calculateCarbohydrateClientExplanation(c:any){
  const findings:string[]=[];
  if(c.signals.carbohydrate==='below_reference_range')findings.push('В описанном типичном рационе доля энергии из углеводов ниже используемого рабочего диапазона.');
  if(c.signals.carbohydrate==='within_reference_range')findings.push('В описанном типичном рационе доля энергии из углеводов находится в используемом рабочем диапазоне.');
  if(c.signals.carbohydrate==='above_reference_range')findings.push('В описанном типичном рационе доля энергии из углеводов выше используемого рабочего диапазона.');
  if(['markedly_insufficient','below_minimum'].includes(c.signals.fibre))findings.push('Количество пищевых волокон в описанном типичном рационе ниже минимального уровня.');
  if(c.signals.fibre==='minimum_sufficient')findings.push('Количество пищевых волокон находится на минимально достаточном уровне.');
  if(c.signals.fibre==='optimal_working')findings.push('Количество пищевых волокон находится в оптимальном рабочем диапазоне.');
  if(c.signals.fibre==='high_target')findings.push('Количество пищевых волокон находится на высоком целевом уровне.');
  if(c.signals.fibre==='individual_assessment')findings.push('Количество пищевых волокон выше 40 г и оценивается консультантом индивидуально.');
  if(c.signals.freeSugars==='above_recommended')findings.push('Доля энергии из свободных сахаров составляет 10% или более.');
  if(['significant','majority'].includes(c.signals.evening))findings.push('Значительная доля углеводов описанного типичного рациона приходится на ужин и последующие эпизоды питания.');
  if(c.signals.refined==='refined_dominant')findings.push('Более половины доступных углеводов описанного типичного рациона формируют рафинированные источники.');
  const dataPoint=c.dataStatus==='insufficient_data'?'Для части углеводных показателей недостаточно данных.':c.dataStatus==='uncertain_boundary'?'Погрешность оценки порций может изменить один из пограничных выводов.':c.dataStatus==='usable_with_caveat'?'Часть порций оценена диапазоном; показанные категории устойчивы в его пределах.':null;
  const summary=findings[0]??dataPoint??'По заполненным данным выраженного отклонения в этом разделе не выявлено.',points=findings.slice(1,dataPoint?3:4);if(dataPoint&&dataPoint!==summary)points.push(dataPoint);
  return createClientNutrientExplanation({title:'Что показал анализ углеводов',summary,points,next_step:'Обсудите результат с консультантом вместе с остальными разделами питания.',disclaimer:''});
}
export function isCarbohydrateExplanationApprovalCurrent(approval:any,sourceIntakeVersion:number,targetVersion:number,hash:string){return Boolean(approval&&approval.sourceIntakeVersion===sourceIntakeVersion&&approval.targetVersion===targetVersion&&approval.explanationHash===hash);}
