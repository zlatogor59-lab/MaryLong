import{describe,expect,it}from'vitest';import{extractProfessionalPriorityContext}from'./professional-priority-context';
const analysis=(goal:string,confirmed:string,concerns='')=>({sections:[{key:'goals',fields:[{key:'main_goal',value:goal}]},{key:'wellbeing',fields:[{key:'confirmed_conditions',value:confirmed},{key:'concerns',value:concerns}]}]});
describe('professional priority context',()=>{
  it('reads goal and confirmed clinical context',()=>expect(extractProfessionalPriorityContext(analysis('Снижение веса','Подагра'))).toMatchObject({goal:'weight_loss',clinicalContextKeys:['gout'],evidence:{goal:true,clinical_context:true}}));
  it('does not turn a complaint into clinical context',()=>expect(extractProfessionalPriorityContext(analysis('Поддержание','Нет','Болит почка, боюсь камней')).clinicalContextKeys).toEqual([]));
  it('uses only structured repetition evidence',()=>expect(extractProfessionalPriorityContext(analysis('Поддержание','Нет'),{protein:{processed_meat:{group:{episodes:2,meals:2}}},carbohydrate:{episode_analysis:{signals:{repeatedBetweenMealFreeSugar:true}}}}).repeatedModuleKeys).toEqual(['processed_meat','carbohydrate']));
});
