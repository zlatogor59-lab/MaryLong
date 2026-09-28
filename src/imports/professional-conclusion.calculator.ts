export function buildProfessionalConclusion(summary:any){
  const priorities=(summary.priorities??[]).map((item:any,index:number)=>({position:index+1,module_key:item.module_key,related_module_keys:item.related_module_keys??[],code:item.code,fact:item.message,rationale:summary.priority_ranking?.explanations?.find((x:any)=>x.position===index+1)?.factors??[]}));
  const moduleFacts=(summary.modules??[]).filter((module:any)=>module.consultant_facts?.length).map((module:any)=>({module_key:module.key,title:module.title,facts:module.consultant_facts}));
  const limitations=(summary.modules??[]).filter((module:any)=>module.data_status!=='complete').map((module:any)=>({module_key:module.key,title:module.title,status:module.data_status,impact:module.data_status==='not_started'?'Раздел не рассчитан и не участвует в выводах.':'Интерпретация раздела ограничена полнотой данных.'}));
  const review=summary.priority_review??{status:'automatic',version:0,reason:''},hasBlockingPriority=priorities.some((item:any)=>item.code==='not_started'||String(item.code).includes('incomplete'));
  const readiness=review.status==='stale'?'priority_review_required':hasBlockingPriority?'data_review_required':'ready_for_consultant_review';
  const goal=summary.priority_ranking?.context?.goal??null,goalLabel=({weight_loss:'снижение массы тела',muscle_gain:'набор мышечной массы',cardiovascular:'сердечно-сосудистое здоровье',kidney_stone:'профилактика повторного камнеобразования',gout:'контроль факторов, связанных с подагрой'}as Record<string,string>)[goal]??goal;
  const generatedDraft={
    title:'Автоматический связный черновик',
    audience:'consultant',
    publication_status:'not_applicable',
    paragraphs:[
      `Оценка выполнена по ${summary.totals?.complete??0} полным модулям из ${summary.totals?.modules??0}${goalLabel?`; учтена подтверждённая цель: ${goalLabel}`:''}.`,
      priorities.length?`Основные профессиональные приоритеты: ${priorities.map((item:any)=>item.fact).join(' ')}`:'Автоматические профессиональные приоритеты не сформированы.',
      moduleFacts.length?`Поддерживающий контекст: ${moduleFacts.flatMap((item:any)=>item.facts).join(' ')}`:'Дополнительных поддерживающих фактов по модулям нет.',
      limitations.length?`Ограничения интерпретации: ${limitations.map((item:any)=>`${item.title} — ${item.impact.toLowerCase()}`).join(' ')}`:'Существенных ограничений полноты данных не выявлено.',
      review.status==='applied'?`Консультант изменил автоматический порядок. Зафиксированная причина: ${review.reason||'причина не указана'}.`:review.status==='stale'?'Ранее сохранённое решение консультанта устарело и требует повторной проверки.':'Использован автоматический порядок приоритетов.',
      readiness==='ready_for_consultant_review'?'Черновик готов к профессиональной проверке консультантом. Он не является диагнозом и не предназначен для публикации клиенту.':'Перед завершением заключения необходимо устранить указанные блокеры. Черновик не предназначен для публикации клиенту.',
    ],
  };
  return{version:2,title:'Профессиональное заключение по рациону',audience:'consultant',client_publication_status:'not_applicable',status:'draft',generated_draft:generatedDraft,sections:[
    {key:'assessment_basis',title:'Основание оценки',content:{modules_assessed:summary.totals?.modules??0,modules_complete:summary.totals?.complete??0,goal:summary.priority_ranking?.context?.goal??null,limitations_count:limitations.length}},
    {key:'priority_findings',title:'Приоритетные профессиональные выводы',items:priorities},
    {key:'supporting_findings',title:'Поддерживающие факты по модулям',items:moduleFacts},
    {key:'data_limitations',title:'Ограничения данных',items:limitations},
    {key:'consultant_decision',title:'Решение консультанта по приоритетам',content:{status:review.status,version:review.version,reason:review.reason||null}},
    {key:'readiness',title:'Готовность заключения',content:{status:readiness,blocking_reasons:readiness==='priority_review_required'?['Сохранённая ручная тройка устарела после изменения исходных расчётов.']:hasBlockingPriority?['В приоритетах есть блокирующий сигнал качества данных.']:[]}},
  ]};
}
