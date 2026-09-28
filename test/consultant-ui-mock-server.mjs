import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'web');
const port = Number(process.env.CONSULTANT_UI_PORT || 4174);
const clientId = '11111111-1111-4111-8111-111111111111';
const submissionId = '22222222-2222-4222-8222-222222222222';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const uiRole = process.env.CONSULTANT_UI_ROLE === 'admin' ? 'admin' : 'consultant';
let submissionStatus = process.env.CONSULTANT_UI_AUTO_ACCEPT === '1' ? 'accepted' : 'verified';
let noteBody = '';
let noteVersion = 0;
let booking = { status:'pending',scheduled_at:null,contact_note:'',version:0,updated_at:null };
let proteinTarget = { source:null,bmi_exact:null,bmi_rounded:null,protein_factor_g:null,target_min_g:null,target_max_g:null,reason:'',version:0,updated_at:null };
const foodProducts=[{id:'33333333-3333-4333-8333-333333333331',name:'Синтетическая чечевица',proteinPer100g:10,origin:'plant',plantSharePercent:100,sourceLabel:'SYNTHETIC_TEST_ONLY',sourceReference:null,version:1},{id:'33333333-3333-4333-8333-333333333332',name:'Синтетическая рыба',proteinPer100g:20,origin:'animal',plantSharePercent:0,sourceLabel:'SYNTHETIC_TEST_ONLY',sourceReference:null,version:1}];
let managedProducts=[
  {id:'44444444-4444-4444-8444-444444444441',canonicalName:'Молоко 2,5%',proteinPer100g:3.1,energyKcalPer100g:52,carbohydratePer100g:4.7,fibrePer100g:0,totalFatPer100g:2.5,origin:'animal',plantSharePercent:0,sourceLabel:'Синтетический источник A',sourceReference:'TEST-A',status:'verified',createdBy:'admin',verifiedBy:'admin',verifiedAt:'2026-09-20T10:00:00Z',createdAt:'2026-09-20T09:00:00Z',updatedAt:'2026-09-20T10:00:00Z',version:2},
  {id:'44444444-4444-4444-8444-444444444442',canonicalName:'Молоко 2.5 %',proteinPer100g:3.0,energyKcalPer100g:53,carbohydratePer100g:4.8,fibrePer100g:null,totalFatPer100g:2.5,origin:'animal',plantSharePercent:0,sourceLabel:'Синтетический источник B',sourceReference:'TEST-B',status:'draft',createdBy:'admin',verifiedBy:null,verifiedAt:null,createdAt:'2026-09-21T09:00:00Z',updatedAt:'2026-09-21T09:00:00Z',version:1},
  {id:'44444444-4444-4444-8444-444444444443',canonicalName:'Гречка варёная',proteinPer100g:3.4,energyKcalPer100g:110,carbohydratePer100g:21.3,fibrePer100g:2.7,totalFatPer100g:1,origin:'plant',plantSharePercent:100,sourceLabel:'Синтетический источник C',sourceReference:'TEST-C',status:'draft',createdBy:'admin',verifiedBy:null,verifiedAt:null,createdAt:'2026-09-22T09:00:00Z',updatedAt:'2026-09-22T09:00:00Z',version:1},
];
let managedAuditEvents=[
  {id:'55555555-5555-4555-8555-555555555551',resourceId:'44444444-4444-4444-8444-444444444441',occurredAt:'2026-09-20T09:00:00Z',actorUserId:'synthetic-admin',actorRole:'admin',action:'CREATE',decision:'SUCCESS',reasonCode:'FOOD_PRODUCT_DRAFT_CREATED'},
  {id:'55555555-5555-4555-8555-555555555552',resourceId:'44444444-4444-4444-8444-444444444441',occurredAt:'2026-09-20T10:00:00Z',actorUserId:'synthetic-admin',actorRole:'admin',action:'VERIFY',decision:'SUCCESS',reasonCode:'FOOD_PRODUCT_VERIFIED'},
];
const recordManagedAudit=(resourceId,action,reasonCode)=>managedAuditEvents.push({id:crypto.randomUUID(),resourceId,occurredAt:new Date().toISOString(),actorUserId:'synthetic-admin',actorRole:'admin',action,decision:'SUCCESS',reasonCode});
const managedSnapshot=card=>Object.fromEntries(['canonicalName','proteinPer100g','energyKcalPer100g','carbohydratePer100g','fibrePer100g','totalFatPer100g','origin','plantSharePercent','sourceLabel','sourceReference','mineralProfile','vitaminProfile','enrichmentProfile','status','replacementCardId','verifiedBy','verifiedAt'].map(key=>[key,card[key]??null]));
let managedVersions=managedProducts.map(card=>({id:crypto.randomUUID(),cardId:card.id,version:card.version,changeKind:'BACKFILL',changedBy:'synthetic-admin',createdAt:card.updatedAt,snapshot:managedSnapshot(card)}));
const recordManagedVersion=(card,changeKind)=>managedVersions.push({id:crypto.randomUUID(),cardId:card.id,version:card.version,changeKind,changedBy:'synthetic-admin',createdAt:new Date().toISOString(),snapshot:managedSnapshot(card)});
const managedVersionFields=Object.keys(managedSnapshot(managedProducts[0])).filter(field=>!['mineralProfile','vitaminProfile','enrichmentProfile'].includes(field));
const sameManaged=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const managedProfileChanges=(prefix,leftValue,rightValue)=>{const left=leftValue&&typeof leftValue==='object'?leftValue:{},right=rightValue&&typeof rightValue==='object'?rightValue:{};return[...new Set([...Object.keys(left),...Object.keys(right)])].sort().filter(key=>!sameManaged(left[key],right[key])).map(key=>({field:`${prefix}.${key}`,before:left[key]??null,after:right[key]??null}));};
const managedEnrichmentChanges=(leftValue,rightValue)=>{const left=leftValue&&typeof leftValue==='object'?leftValue:{},right=rightValue&&typeof rightValue==='object'?rightValue:{},changes=[];for(const key of ['status','evidenceBasis','identityScope','marketCountries','limitation'])if(!sameManaged(left[key],right[key]))changes.push({field:`enrichmentProfile.${key}`,before:left[key]??null,after:right[key]??null});return[...changes,...managedProfileChanges('enrichmentProfile.nutrients',left.nutrients,right.nutrients)];};
const compareManagedVersions=rows=>{let previous=null;return rows.sort((a,b)=>a.version-b.version).map(row=>{const changes=previous?[...managedVersionFields.filter(field=>!sameManaged(previous[field],row.snapshot[field])).map(field=>({field,before:previous[field]??null,after:row.snapshot[field]??null})),...managedProfileChanges('mineralProfile',previous.mineralProfile,row.snapshot.mineralProfile),...managedProfileChanges('vitaminProfile',previous.vitaminProfile,row.snapshot.vitaminProfile),...managedEnrichmentChanges(previous.enrichmentProfile,row.snapshot.enrichmentProfile)]:[];previous=row.snapshot;const{snapshot,cardId,...result}=row;return{...result,changes};});};
let proteinIntake={items:[],summary:null,version:0,updated_at:null};

const sendJson = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === 'GET' && url.pathname === '/api/v1/auth/config') return sendJson(response, 200, { enabled:false });
  if (request.method === 'GET' && url.pathname === '/api/v1/me') return sendJson(response, 200, { id:`synthetic-${uiRole}`, display_name:uiRole==='admin'?'Тестовый администратор':'Тестовый консультант', role:uiRole });
  if(request.method==='GET'&&url.pathname==='/api/v1/admin/food-products/duplicates'){const items=managedProducts.slice(0,2).filter(item=>item.status!=='retired');return sendJson(response,200,{groups:items.length>1?[{normalized_name:'молоко 2 5',items}]:[]});}
  if(request.method==='GET'&&url.pathname==='/api/v1/admin/food-products/sync-runs')return sendJson(response,200,{items:[{operation:'sync-seafood',status:'succeeded',resultSummary:{records:1,created:0,skipped:3},integritySummary:{status:'passed',cardsChecked:84,issues:0,orphanSnapshots:0},errorCode:null,startedAt:'2026-09-28T12:33:34Z',completedAt:'2026-09-28T12:33:35Z'},{operation:'seed-local',status:'failed',resultSummary:null,integritySummary:{status:'failed'},errorCode:'OPERATION_FAILED',startedAt:'2026-09-28T12:34:34Z',completedAt:'2026-09-28T12:34:35Z'},{operation:'sync-photo-001-vitamins',status:'interrupted',resultSummary:null,integritySummary:{status:'not_run',reason:'process_interrupted'},errorCode:'PROCESS_INTERRUPTED',startedAt:'2026-09-28T11:00:00Z',completedAt:'2026-09-28T11:05:01Z'}]});
  if(request.method==='GET'&&url.pathname==='/api/v1/admin/food-products'){const search=(url.searchParams.get('search')||'').toLocaleLowerCase('uk-UA'),status=url.searchParams.get('status');return sendJson(response,200,managedProducts.filter(item=>(!status||item.status===status)&&(!search||item.canonicalName.toLocaleLowerCase('uk-UA').includes(search))));}
  if(request.method==='POST'&&url.pathname==='/api/v1/admin/food-products'){let raw='';request.setEncoding('utf8');request.on('data',chunk=>raw+=chunk);return request.on('end',()=>{const input=JSON.parse(raw),item={id:crypto.randomUUID(),canonicalName:input.canonical_name,proteinPer100g:input.protein_per_100g,energyKcalPer100g:input.energy_kcal_per_100g,carbohydratePer100g:input.carbohydrate_per_100g,fibrePer100g:input.fibre_per_100g,totalFatPer100g:input.total_fat_per_100g,origin:input.origin,plantSharePercent:input.plant_share_percent,sourceLabel:input.source_label,sourceReference:input.source_reference,mineralProfile:input.mineral_profile,vitaminProfile:input.vitamin_profile,enrichmentProfile:input.enrichment_profile,status:'draft',createdBy:'admin',verifiedBy:null,verifiedAt:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:1};managedProducts.push(item);recordManagedVersion(item,'CREATE');recordManagedAudit(item.id,'CREATE','FOOD_PRODUCT_DRAFT_CREATED');sendJson(response,201,item);});}
  const mergeMatch=url.pathname.match(/^\/api\/v1\/admin\/food-products\/([0-9a-f-]+)\/merge$/);
  if(mergeMatch&&request.method==='POST'){let raw='';request.setEncoding('utf8');request.on('data',chunk=>raw+=chunk);return request.on('end',()=>{const input=JSON.parse(raw),duplicate=managedProducts.find(item=>item.id===mergeMatch[1]),primary=managedProducts.find(item=>item.id===input.primary_id),expected=Number(String(request.headers['if-match']||'').replace(/[^0-9]/g,''));if(!duplicate||!primary)return sendJson(response,404,{error:{code:'RESOURCE_UNAVAILABLE'}});if(expected!==duplicate.version||input.primary_version!==primary.version)return sendJson(response,409,{error:{code:'FOOD_PRODUCT_VERSION_CONFLICT'}});Object.assign(duplicate,{status:'retired',replacementCardId:primary.id,updatedAt:new Date().toISOString(),version:duplicate.version+1});recordManagedVersion(duplicate,'MERGE');recordManagedAudit(duplicate.id,'MERGE','FOOD_PRODUCT_DUPLICATE_MERGED');sendJson(response,200,{primary,duplicate});});}
  const historyMatch=url.pathname.match(/^\/api\/v1\/admin\/food-products\/([0-9a-f-]+)\/history$/);
  if(historyMatch&&request.method==='GET'){if(!managedProducts.some(item=>item.id===historyMatch[1]))return sendJson(response,404,{error:{code:'RESOURCE_UNAVAILABLE'}});return sendJson(response,200,{events:managedAuditEvents.filter(event=>event.resourceId===historyMatch[1]).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).map(({resourceId,...event})=>event),versions:compareManagedVersions(managedVersions.filter(version=>version.cardId===historyMatch[1]))});}
  const managedMatch=url.pathname.match(/^\/api\/v1\/admin\/food-products\/([0-9a-f-]+)(\/verify)?$/);
  if(managedMatch&&request.method==='PATCH'&&!managedMatch[2]){let raw='';request.setEncoding('utf8');request.on('data',chunk=>raw+=chunk);return request.on('end',()=>{const index=managedProducts.findIndex(item=>item.id===managedMatch[1]),item=managedProducts[index],expected=Number(String(request.headers['if-match']||'').replace(/[^0-9]/g,''));if(!item)return sendJson(response,404,{error:{code:'RESOURCE_UNAVAILABLE'}});if(expected!==item.version)return sendJson(response,409,{error:{code:'FOOD_PRODUCT_VERSION_CONFLICT'}});const input=JSON.parse(raw);managedProducts[index]={...item,canonicalName:input.canonical_name,proteinPer100g:input.protein_per_100g,energyKcalPer100g:input.energy_kcal_per_100g,carbohydratePer100g:input.carbohydrate_per_100g,fibrePer100g:input.fibre_per_100g,totalFatPer100g:input.total_fat_per_100g,origin:input.origin,plantSharePercent:input.plant_share_percent,sourceLabel:input.source_label,sourceReference:input.source_reference,mineralProfile:input.mineral_profile,vitaminProfile:input.vitamin_profile,enrichmentProfile:input.enrichment_profile,updatedAt:new Date().toISOString(),version:item.version+1};recordManagedVersion(managedProducts[index],'UPDATE');recordManagedAudit(item.id,'UPDATE','FOOD_PRODUCT_DRAFT_UPDATED');sendJson(response,200,managedProducts[index]);});}
  if(managedMatch&&request.method==='POST'&&managedMatch[2]){const item=managedProducts.find(item=>item.id===managedMatch[1]),expected=Number(String(request.headers['if-match']||'').replace(/[^0-9]/g,''));if(!item)return sendJson(response,404,{error:{code:'RESOURCE_UNAVAILABLE'}});if(expected!==item.version)return sendJson(response,409,{error:{code:'FOOD_PRODUCT_VERSION_CONFLICT'}});if(!item.sourceReference)return sendJson(response,400,{error:{code:'FOOD_PRODUCT_SOURCE_REFERENCE_REQUIRED'}});Object.assign(item,{status:'verified',verifiedBy:'admin',verifiedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:item.version+1});recordManagedVersion(item,'VERIFY');recordManagedAudit(item.id,'VERIFY','FOOD_PRODUCT_VERIFIED');return sendJson(response,200,item);}
  if (request.method === 'GET' && url.pathname === '/api/v1/clients') {
    return sendJson(response, 200, { items: [{ id: clientId, label: 'Клиент 11111111', status: 'active', version: 1 }] });
  }
  if (request.method === 'POST' && url.pathname === `/api/v1/clients/${clientId}/submissions/import-preview/csv`) {
    request.resume();
    return request.on('end', () => { submissionStatus='verified'; sendJson(response, 201, {
      submission_id: submissionId, schema_id: 'nutrition-questionnaire/v2', consent_status: 'verified', status: 'verified', block_code: null,
    }); });
  }
  if (request.method === 'GET' && url.pathname === `/api/v1/clients/${clientId}/submissions`) return sendJson(response, 200, { items:[{
    submission_id:submissionId,schema_id:'nutrition-questionnaire/v2',consent_status:'verified',status:submissionStatus,
    block_code:submissionStatus==='blocked'?'CONSULTANT_REJECTED':null,created_at:'2026-08-13T10:00:00.000Z',
  }] });
  if (request.method === 'GET' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/analysis`) {
    if (submissionStatus !== 'accepted') return sendJson(response, 404, { error:{ code:'RESOURCE_UNAVAILABLE' } });
    return sendJson(response, 200, {
      submission_id:submissionId,
      schema_id:'forms_v2_76_columns',
      disclaimer:'Показаны исходные ответы клиента. Автоматические медицинские выводы не формируются.',
      sections:[
        {key:'profile',title:'Исходные данные',fields:[{key:'height_cm',label:'Рост, см',value:'170'},{key:'weight_kg',label:'Масса, кг',value:'70'}]},
        {key:'goals',title:'Цели и контекст',fields:[{key:'main_goal',label:'Главная цель',value:'Синтетическая проверка рабочего обзора'}]},
        {key:'food_day',title:'Питание за день',fields:[{key:'lunch',label:'Обед',value:'Синтетические данные: гречка, овощи'}]},
      ],
    });
  }
  if (request.method === 'GET' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/nutrition-summary`) {
    return sendJson(response, 200, {
      totals:{modules:9,complete:9,with_attention:4,approved_for_client:0},modules:[],
      priorities:[
        {module_key:'purine_load',level:'high',message:'Пуриновая нагрузка: проверить основные животные источники.'},
        {module_key:'oxalate_calcium',level:'medium',message:'Кальций и оксалатный источник: оценить как связанную тему.'},
        {module_key:'fat',level:'medium',message:'Жиры и переработанное мясо: рассмотреть как единый пищевой паттерн.'},
      ],
      priority_ranking:{explanations:[],available_priorities:[]},priority_review:{status:'automatic',version:0},
    });
  }
  if (request.method === 'GET' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/nutrition-summary/professional-conclusion`) {
    return sendJson(response, 200, {
      generated_draft:{title:'Черновик профессионального заключения',paragraphs:[
        'Оценка выполнена по описанному типичному рациону. Полнота расчётных модулей — 9 из 9.',
        'Главные профессиональные приоритеты: пуриновая нагрузка; связанная тема кальция и оксалатного источника; жиры и переработанное мясо.',
        'Пуриновая нагрузка составляет 434,5 мг: животные источники — 348,1 мг, растительные — 86,4 мг. Основные источники — свиная лопатка и сельдь.',
        'Перед финализацией консультанту необходимо сопоставить находки с целью клиента, повторяемостью питания и клиническим контекстом.',
      ]},
      sections:[
        {key:'assessment_basis',title:'Основание оценки',items:[],content:{modules_complete:9,modules_assessed:9}},
        {key:'priority_findings',title:'Приоритетные находки',items:[{fact:'Пуриновая нагрузка и основные источники требуют профессиональной оценки.'},{fact:'Кальций и оксалатный источник объединены в одну тему.'},{fact:'Жиры и переработанное мясо объединены в один пищевой паттерн.'}]},
        {key:'supporting_findings',title:'Дополнительные находки',items:[{fact:'Покрытие данных по пуринам — 100%.'}]},
        {key:'data_limitations',title:'Ограничения данных',items:[{fact:'Вывод относится к описанному типичному рациону, а не к многодневному наблюдению.'}]},
        {key:'consultant_decision',title:'Решение консультанта',items:[],content:{status:'automatic'}},
        {key:'readiness',title:'Готовность',items:[],content:{status:'ready_for_consultant_review'}},
      ],
      draft:{version:0,status:'draft',source_status:'current',deviates_from_automatic:false,editorial:{}},
    });
  }
  if (request.method === 'GET' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/note`) {
    if (submissionStatus !== 'accepted') return sendJson(response, 404, { error:{ code:'RESOURCE_UNAVAILABLE' } });
    return sendJson(response, 200, { submission_id:submissionId,body:noteBody,version:noteVersion,updated_at:noteVersion?'2026-08-14T10:00:00.000Z':null });
  }
  if (request.method === 'PATCH' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/note`) {
    if (submissionStatus !== 'accepted') return sendJson(response, 404, { error:{ code:'RESOURCE_UNAVAILABLE' } });
    let raw='';request.setEncoding('utf8');request.on('data',chunk=>raw+=chunk);return request.on('end',()=>{
      const expected=Number(String(request.headers['if-match']||'').replace(/[^0-9]/g,''));
      if(expected!==noteVersion)return sendJson(response,409,{error:{code:'CONSULTANT_NOTE_VERSION_CONFLICT'}});
      noteBody=JSON.parse(raw).body.trim();noteVersion+=1;
      sendJson(response,200,{submission_id:submissionId,body:noteBody,version:noteVersion,updated_at:'2026-08-14T10:00:00.000Z'});
    });
  }
  if (request.method === 'GET' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/booking`) {
    if (submissionStatus !== 'accepted') return sendJson(response, 404, { error:{ code:'RESOURCE_UNAVAILABLE' } });
    return sendJson(response, 200, { submission_id:submissionId,...booking });
  }
  if (request.method === 'PATCH' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/booking`) {
    if (submissionStatus !== 'accepted') return sendJson(response, 404, { error:{ code:'RESOURCE_UNAVAILABLE' } });
    let raw='';request.setEncoding('utf8');request.on('data',chunk=>raw+=chunk);return request.on('end',()=>{
      const expected=Number(String(request.headers['if-match']||'').replace(/[^0-9]/g,''));
      if(expected!==booking.version)return sendJson(response,409,{error:{code:'CONSULTATION_BOOKING_VERSION_CONFLICT'}});
      const input=JSON.parse(raw);booking={...input,version:booking.version+1,updated_at:'2026-08-16T10:00:00.000Z'};
      sendJson(response,200,{submission_id:submissionId,...booking});
    });
  }
  if (request.method === 'GET' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/protein-target`) {
    if (submissionStatus !== 'accepted') return sendJson(response, 404, { error:{ code:'RESOURCE_UNAVAILABLE' } });
    return sendJson(response, 200, { submission_id:submissionId,...proteinTarget });
  }
  if (request.method === 'PATCH' && url.pathname === `/api/v1/clients/${clientId}/submissions/${submissionId}/protein-target`) {
    if (submissionStatus !== 'accepted') return sendJson(response, 404, { error:{ code:'RESOURCE_UNAVAILABLE' } });
    let raw='';request.setEncoding('utf8');request.on('data',chunk=>raw+=chunk);return request.on('end',()=>{
      const expected=Number(String(request.headers['if-match']||'').replace(/[^0-9]/g,''));
      if(expected!==proteinTarget.version)return sendJson(response,409,{error:{code:'PROTEIN_TARGET_VERSION_CONFLICT'}});
      const input=JSON.parse(raw),builtIn=input.source==='built_in';proteinTarget={source:input.source,bmi_exact:builtIn?24.22:null,bmi_rounded:builtIn?24:null,protein_factor_g:builtIn?89:input.protein_factor_g,target_min_g:builtIn?75:input.target_min_g,target_max_g:builtIn?100:input.target_max_g,reason:input.reason||'',version:proteinTarget.version+1,updated_at:'2026-08-16T10:00:00.000Z'};
      sendJson(response,200,{submission_id:submissionId,...proteinTarget});
    });
  }
  if(request.method==='GET'&&url.pathname===`/api/v1/clients/${clientId}/food-products`)return sendJson(response,200,{items:foodProducts});
  if(request.method==='GET'&&url.pathname===`/api/v1/clients/${clientId}/submissions/${submissionId}/protein-intake`)return sendJson(response,200,{submission_id:submissionId,...proteinIntake});
  if(request.method==='PATCH'&&url.pathname===`/api/v1/clients/${clientId}/submissions/${submissionId}/protein-intake`){let raw='';request.setEncoding('utf8');request.on('data',chunk=>raw+=chunk);return request.on('end',()=>{const expected=Number(String(request.headers['if-match']||'').replace(/[^0-9]/g,''));if(expected!==proteinIntake.version)return sendJson(response,409,{error:{code:'PROTEIN_INTAKE_VERSION_CONFLICT'}});const items=JSON.parse(raw).items,lines=items.map(item=>{const product=foodProducts.find(p=>p.id===item.product_card_id),proteinG=item.mass_g*product.proteinPer100g/100,plantProteinG=proteinG*product.plantSharePercent/100;return {...item,product,proteinG,plantProteinG,animalProteinG:proteinG-plantProteinG};}),total=lines.reduce((n,l)=>n+l.proteinG,0),plant=lines.reduce((n,l)=>n+l.plantProteinG,0),animal=total-plant;proteinIntake={items,lines,unresolved:[],summary:{total_protein_g:total,plant_protein_g:plant,animal_protein_g:animal,plant_share_percent:total?plant/total*100:null,plant_share_status:total&&plant/total>=.5?'meets_guide':'below_guide',completeness_percent:100,meal_totals:[],target_min_g:75,target_max_g:100,range_status:total<75?'below_range':total>100?'above_range':'within_range'},version:proteinIntake.version+1,updated_at:'2026-08-16T19:00:00.000Z'};sendJson(response,200,{submission_id:submissionId,...proteinIntake});});}
  if (request.method === 'POST' && url.pathname === `/api/v1/submissions/${submissionId}/accept`) {
    request.resume();
    return request.on('end', () => { submissionStatus='accepted'; sendJson(response, 200, {
      submission_id: submissionId, schema_id: 'nutrition-questionnaire/v2', consent_status: 'verified', status: 'accepted', block_code: null,
    }); });
  }
  if (request.method === 'POST' && url.pathname === `/api/v1/submissions/${submissionId}/reject`) {
    request.resume();
    return request.on('end', () => { submissionStatus='blocked'; sendJson(response, 200, {
      submission_id: submissionId, schema_id: 'nutrition-questionnaire/v2', consent_status: 'verified', status: 'blocked', block_code:'CONSULTANT_REJECTED',
    }); });
  }

  const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const filePath = normalize(join(root, relative));
  if (!filePath.startsWith(root)) return sendJson(response, 404, { error: { code: 'NOT_FOUND' } });
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not-file');
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: { code: 'NOT_FOUND' } });
  }
}).listen(port, '127.0.0.1', () => process.stdout.write(`consultant-ui-mock:${port}\n`));
