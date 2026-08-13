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
