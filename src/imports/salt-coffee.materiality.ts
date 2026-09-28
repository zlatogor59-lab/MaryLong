export function assessSaltCoffeeMateriality(value:any){
  if(!value||value.status!=='available')return{status:'not_present',message:null,rule:null};
  const saltPresent=Number(value.totals?.added_salt_g)>0||(value.totals?.added_salt_g===null&&value.totals?.added_salt_lower_estimate_g!==undefined);
  const iodineIncomplete=saltPresent&&Number(value.completeness?.salt_iodine_percent)<100;
  if(iodineIncomplete)return{status:'material',rule:'iodine_lower_estimate',message:'Добавленная соль описана не полностью: известные натрий и йод являются нижней оценкой, а категоричный вывод требует уточнить количество и йодирование.'};
  return{status:'not_material',message:null,rule:null};
}
