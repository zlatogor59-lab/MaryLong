export type PriorityContext={
  goal?:string|null;
  repeatedModuleKeys?:string[];
  clinicalContextKeys?:string[];
};

type Candidate={module_key:string;level:string;code:string;message:string;rank:number;index:number;[key:string]:unknown};

const clusters:Record<string,string>={
  fat:'fat_quality',processed_meat:'fat_quality',
  oxalate_calcium:'calcium_oxalate',calcium_phosphorus:'calcium_oxalate',
};
const goalMatches:Record<string,string[]>={
  weight_loss:['fat','processed_meat','carbohydrate'],
  muscle_gain:['protein'],
  cardiovascular:['fat','processed_meat','salt_coffee'],
  kidney_stone:['oxalate_calcium','calcium_phosphorus','purine_load','pral'],
  gout:['purine_load'],
};
const clinicalMatches:Record<string,string[]>={
  kidney_stone:['oxalate_calcium','calcium_phosphorus','purine_load','pral'],
  gout:['purine_load'],
  kidney_disease:['protein','purine_load','pral','salt_coffee'],
  cardiovascular:['fat','processed_meat','salt_coffee'],
};

const includes=(map:Record<string,string[]>,keys:string[],moduleKey:string)=>keys.some(key=>map[key]?.includes(moduleKey));

/** Ranks professional signals only. Missing context contributes zero and is never inferred. */
export function rankProfessionalPriorities(candidates:Candidate[],context:PriorityContext={},limit=3):Array<Record<string,unknown>>{
  const repeated=new Set(context.repeatedModuleKeys??[]),clinical=context.clinicalContextKeys??[],goal=context.goal?[context.goal]:[];
  const scored=candidates.map(candidate=>({
    ...candidate,
    score:candidate.rank
      +(includes(goalMatches,goal,candidate.module_key)?25:0)
      +(repeated.has(candidate.module_key)?20:0)
      +(includes(clinicalMatches,clinical,candidate.module_key)?30:0),
    cluster:clusters[candidate.module_key]??candidate.module_key,
  })).sort((a,b)=>b.score-a.score||a.index-b.index);
  const grouped=new Map<string,typeof scored>();
  for(const candidate of scored)grouped.set(candidate.cluster,[...(grouped.get(candidate.cluster)??[]),candidate]);
  return [...grouped.values()].map(group=>{
    const primary=group[0],related=group.slice(1);
    const {rank,index,score,cluster,...result}=primary;
    if(!related.length)return result;
    return {...result,
      related_module_keys:related.map(item=>item.module_key),
      related_codes:related.map(item=>item.code),
      message:`${primary.message} Связанный сигнал: ${related.map(item=>item.message).join(' ')}`,
    };
  }).slice(0,limit);
}

export function explainProfessionalPriorities(priorities:Array<Record<string,any>>,context:PriorityContext={}){
  const goal=context.goal?[context.goal]:[],clinical=context.clinicalContextKeys??[],repeated=new Set(context.repeatedModuleKeys??[]);
  return priorities.map((priority,index)=>{
    const moduleKeys=[priority.module_key,...(priority.related_module_keys??[])];
    const goalApplied=moduleKeys.some(key=>includes(goalMatches,goal,key));
    const repetitionApplied=moduleKeys.some(key=>repeated.has(key));
    const clinicalApplied=moduleKeys.some(key=>includes(clinicalMatches,clinical,key));
    const factors=[
      {key:'signal_strength',status:'applied',detail:priority.level==='data'?'Качество данных требует первоочередной проверки.':priority.level==='balance'?'Есть количественное отклонение от рабочего диапазона.':'Есть профессионально значимый сигнал.'},
      {key:'data_quality',status:priority.level==='data'?'limiting':'passed',detail:priority.level==='data'?'Надёжная интерпретация ограничена исходными данными.':'Шлюз качества для сигнала пройден.'},
      {key:'client_goal',status:goalApplied?'applied':context.goal?'not_relevant':'not_available',detail:goalApplied?'Сигнал связан с подтверждённой целью клиента.':context.goal?'Подтверждённая цель не повышает этот сигнал.':'Цель не распознана как фактор этого сигнала.'},
      {key:'repetition',status:repetitionApplied?'applied':'not_confirmed',detail:repetitionApplied?'Повторяемость подтверждена структурированными данными.':'Подтверждённая повторяемость не использована.'},
      {key:'clinical_context',status:clinicalApplied?'applied':clinical.length?'not_relevant':'not_available',detail:clinicalApplied?'Сигнал связан с подтверждённым клиническим контекстом.':clinical.length?'Подтверждённый контекст не повышает этот сигнал.':'Подтверждённый клинический контекст не указан.'},
    ];
    return{position:index+1,module_key:priority.module_key,related_module_keys:priority.related_module_keys??[],factors};
  });
}
