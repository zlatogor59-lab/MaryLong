import type{PriorityContext}from'./professional-priority-ranker';

type Analysis={sections?:Array<{key:string;fields?:Array<{key:string;value:string}>}>};

const text=(analysis:Analysis,sectionKey:string,fieldKeys:string[])=>(analysis.sections??[])
  .find(section=>section.key===sectionKey)?.fields?.filter(field=>fieldKeys.includes(field.key)).map(field=>field.value.toLowerCase()).join(' ')??'';

const detectGoal=(value:string):string|null=>{
  if(/сниж|похуд|уменьш.*вес|вес.*уменьш/.test(value))return'weight_loss';
  if(/мышеч|набор.*масс|набрать.*вес/.test(value))return'muscle_gain';
  if(/серд|давлен|холестерин/.test(value))return'cardiovascular';
  if(/подагр|мочев.*кислот/.test(value))return'gout';
  if(/камн|оксалат|мочекамен/.test(value))return'kidney_stone';
  return null;
};

/** Converts only explicit questionnaire evidence into ranking context. */
export function extractProfessionalPriorityContext(analysis:Analysis,source:any={}):PriorityContext&{evidence:{goal:boolean;clinical_context:boolean;repetition:boolean}}{
  const goalText=text(analysis,'goals',['main_goal','goal_details']);
  const clinicalText=text(analysis,'wellbeing',['confirmed_conditions','doctor_guidance']);
  const clinicalContextKeys:string[]=[];
  if(/подагр|мочев.*кислот/.test(clinicalText))clinicalContextKeys.push('gout');
  if(/мочекамен|камн.{0,20}(почек|почк|моч)|оксалат/.test(clinicalText))clinicalContextKeys.push('kidney_stone');
  if(/хроническ.{0,20}(болезн|недостаточност).{0,20}почек|болезн.{0,20}почек/.test(clinicalText))clinicalContextKeys.push('kidney_disease');
  if(/сердечно|гипертен|гипертони|ишемическ|атеросклер/.test(clinicalText))clinicalContextKeys.push('cardiovascular');
  const repeatedModuleKeys:string[]=[];
  const processed=source.protein?.processed_meat?.group;
  if(Number(processed?.episodes)>=2&&Number(processed?.meals)>=2)repeatedModuleKeys.push('processed_meat');
  if(source.carbohydrate?.episode_analysis?.signals?.repeatedBetweenMealFreeSugar)repeatedModuleKeys.push('carbohydrate');
  return{goal:detectGoal(goalText),repeatedModuleKeys,clinicalContextKeys:[...new Set(clinicalContextKeys)],evidence:{goal:Boolean(goalText),clinical_context:Boolean(clinicalText),repetition:repeatedModuleKeys.length>0}};
}
