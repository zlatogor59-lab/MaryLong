import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'web');
const port = Number(process.env.CONSULTANT_UI_PORT || 4174);
const clientId = '11111111-1111-4111-8111-111111111111';
const submissionId = '22222222-2222-4222-8222-222222222222';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
let submissionStatus = 'verified';
let noteBody = '';
let noteVersion = 0;
let booking = { status:'pending',scheduled_at:null,contact_note:'',version:0,updated_at:null };
let proteinTarget = { source:null,bmi_exact:null,bmi_rounded:null,protein_factor_g:null,target_min_g:null,target_max_g:null,reason:'',version:0,updated_at:null };

const sendJson = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === 'GET' && url.pathname === '/api/v1/auth/config') return sendJson(response, 200, { enabled:false });
  if (request.method === 'GET' && url.pathname === '/api/v1/me') return sendJson(response, 200, { id:'synthetic-consultant', display_name:'Тестовый консультант', role:'consultant' });
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
