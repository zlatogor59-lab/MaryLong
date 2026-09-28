import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = async () => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
};
const chromeCandidates = process.platform === 'win32' ? [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
] : [process.env.CHROME_PATH, 'google-chrome', 'chromium', 'chromium-browser'];

async function executable() {
  const { access } = await import('node:fs/promises');
  for (const candidate of chromeCandidates.filter(Boolean)) {
    try { await access(candidate); return candidate; } catch { /* try the next installed browser */ }
  }
  throw new Error('Chrome or Edge was not found. Set CHROME_PATH to run the catalog browser regression.');
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
    });
  }
  async open() { if (this.socket.readyState !== WebSocket.OPEN) await once(this.socket, 'open'); }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise:true, returnByValue:true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  close() { this.socket.close(); }
}

const waitFor = async (cdp, expression, label, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await cdp.evaluate(expression)) return;
    await delay(40);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const serverPort = await freePort();
const profileDir = await mkdtemp(join(tmpdir(), 'catalog-browser-'));
const mock = spawn(process.execPath, ['test/consultant-ui-mock-server.mjs'], {
  cwd: process.cwd(), env:{...process.env, CONSULTANT_UI_ROLE:'admin', CONSULTANT_UI_PORT:String(serverPort)},
  stdio:['ignore', 'pipe', 'pipe'], windowsHide:true,
});
let chrome;
let cdp;
try {
  await Promise.race([
    new Promise((resolve, reject) => {
      mock.stdout.on('data', chunk => { if (String(chunk).includes(`consultant-ui-mock:${serverPort}`)) resolve(); });
      mock.once('exit', code => reject(new Error(`Mock server exited early with code ${code}`)));
    }),
    delay(5000).then(() => { throw new Error('Mock server did not start'); }),
  ]);
  chrome = spawn(await executable(), [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank',
  ], { stdio:'ignore', windowsHide:true });
  let debugPort;
  for (let attempt = 0; attempt < 100 && !debugPort; attempt++) {
    try { debugPort = Number((await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]); }
    catch { await delay(50); }
  }
  if (!debugPort) throw new Error('Chrome DevTools endpoint did not start');
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${serverPort}/?synthetic_test=1`)}`, {method:'PUT'})).json();
  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await waitFor(cdp, `document.querySelector('#catalog-admin')?.hidden === false`, 'admin catalog');
  await cdp.evaluate(`document.querySelector('#catalog-new').click()`);
  await waitFor(cdp, `document.querySelector('#catalog-form')?.hidden === false`, 'new card form');
  await cdp.evaluate(`document.querySelector('details.catalog-profile-fields').open=true`);

  const set = (selector, value, event = 'input') => cdp.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));})()`);
  await set('#catalog-name', 'Автотест обогащённого продукта');
  await set('#catalog-protein', '3.2');
  await set('#catalog-origin', 'animal', 'change');
  await set('#catalog-plant-share', '0');
  await set('#catalog-source-label', 'Синтетическая этикетка');
  await set('#catalog-source-reference', 'BROWSER-REGRESSION-001');
  await set('#catalog-enrichment-status', 'confirmed_fortified', 'change');
  assert.equal(await cdp.evaluate(`document.querySelector('#catalog-form').checkValidity()`), false, 'fortified profile without evidence and nutrients must be invalid');
  assert.match(await cdp.evaluate(`document.querySelector('#catalog-enrichment-evidence').validationMessage`), /основание/i);
  await set('#catalog-enrichment-evidence', 'label', 'change');
  await set('#catalog-enrichment-scope', 'regional_category', 'change');
  await set('#catalog-enrichment-markets', 'UKR');
  assert.match(await cdp.evaluate(`document.querySelector('#catalog-enrichment-markets').validationMessage`), /ISO/i);
  await set('#catalog-enrichment-scope', 'exact_product', 'change');
  await set('#catalog-enrichment-markets', 'UA');

  const calcium = '#catalog-mineral-editor tr[data-key="calcium"]';
  await set(`${calcium} [data-field="status"]`, 'analytical', 'change');
  await set(`${calcium} [data-field="value"]`, '120');
  await set(`${calcium} [data-field="sourceName"]`, 'Лаборатория');
  await set(`${calcium} [data-field="sourceVersion"]`, '2026');
  const vitaminD = '#catalog-vitamin-editor tr[data-key="vitamin_d"]';
  await set(`${vitaminD} [data-field="status"]`, 'analytical', 'change');
  await set(`${vitaminD} [data-field="value"]`, '1.5');
  await set(`${vitaminD} [data-field="sourceName"]`, 'Лаборатория');
  await set(`${vitaminD} [data-field="sourceVersion"]`, '2026');
  const addedD = '#catalog-enrichment-editor tr[data-key="vitamin_d"]';
  await cdp.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(`${addedD} [data-field="included"]`)});el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await set(`${addedD} [data-field="value"]`, '1');
  await set(`${addedD} [data-field="unit"]`, 'ug', 'change');
  assert.equal(await cdp.evaluate(`document.querySelector('#catalog-form').checkValidity()`), false, 'added nutrient without source must be invalid');
  await set(`${addedD} [data-field="sourceName"]`, 'Этикетка');
  await set(`${addedD} [data-field="sourceVersion"]`, '2026-09');
  await set(`${addedD} [data-field="sourceReference"]`, 'LABEL-D-1');
  assert.equal(await cdp.evaluate(`document.querySelector('#catalog-form').checkValidity()`), true);
  await cdp.evaluate(`document.querySelector('#catalog-form').requestSubmit()`);
  await waitFor(cdp, `document.querySelector('#catalog-form-notice')?.textContent.includes('Черновик сохранён')`, 'draft save');

  await cdp.evaluate(`document.querySelector('#catalog-cancel').click()`);
  await cdp.evaluate(`[...document.querySelectorAll('#catalog-list button')].find(el=>el.textContent.includes('Автотест обогащённого продукта')).click()`);
  await waitFor(cdp, `document.querySelector('#catalog-history-count')?.textContent === '1'`, 'creation history');
  await waitFor(cdp, `document.querySelectorAll('#catalog-version-list .catalog-version').length === 1`, 'creation snapshot');
  assert.match(await cdp.evaluate(`document.querySelector('#catalog-history-list').textContent`), /Создан черновик/);
  const reopened = await cdp.evaluate(`(()=>{const q=s=>document.querySelector(s);return{calcium:q('${calcium} [data-field="value"]').value,vitaminD:q('${vitaminD} [data-field="value"]').value,addedD:q('${addedD} [data-field="value"]').value,checked:q('${addedD} [data-field="included"]').checked,market:q('#catalog-enrichment-markets').value};})()`);
  assert.deepEqual(reopened, {calcium:'120', vitaminD:'1.5', addedD:'1', checked:true, market:'UA'});

  const cards = await (await fetch(`http://127.0.0.1:${serverPort}/api/v1/admin/food-products`)).json();
  const current = cards.find(card => card.canonicalName === 'Автотест обогащённого продукта');
  const externalPayload = {
    canonical_name:current.canonicalName, protein_per_100g:current.proteinPer100g,
    energy_kcal_per_100g:current.energyKcalPer100g, carbohydrate_per_100g:current.carbohydratePer100g,
    fibre_per_100g:current.fibrePer100g, total_fat_per_100g:current.totalFatPer100g,
    origin:current.origin, plant_share_percent:current.plantSharePercent,
    source_label:'Внешнее изменение', source_reference:current.sourceReference,
    mineral_profile:{...current.mineralProfile,calcium:{...current.mineralProfile.calcium,valuePer100g:125}}, vitamin_profile:current.vitaminProfile,
    enrichment_profile:{...current.enrichmentProfile,nutrients:{...current.enrichmentProfile.nutrients,vitamin_d:{...current.enrichmentProfile.nutrients.vitamin_d,addedPer100g:1.2}}},
  };
  const external = await fetch(`http://127.0.0.1:${serverPort}/api/v1/admin/food-products/${current.id}`, {method:'PATCH', headers:{'Content-Type':'application/json','If-Match':`"${current.version}"`}, body:JSON.stringify(externalPayload)});
  assert.equal(external.status, 200);
  await set('#catalog-source-label', 'Несохранённое локальное значение');
  await cdp.evaluate(`document.querySelector('#catalog-form').requestSubmit()`);
  await waitFor(cdp, `document.querySelector('#catalog-form-notice')?.textContent.includes('другом окне')`, 'version conflict');
  assert.equal(await cdp.evaluate(`document.querySelector('#catalog-source-label').value`), 'Несохранённое локальное значение', 'local input must survive a conflict');

  await cdp.send('Page.reload', {ignoreCache:true});
  await waitFor(cdp, `document.querySelector('#catalog-admin')?.hidden === false`, 'catalog reload');
  await waitFor(cdp, `[...document.querySelectorAll('#catalog-list button')].some(el=>el.textContent.includes('Автотест обогащённого продукта'))`, 'reloaded card list');
  await cdp.evaluate(`[...document.querySelectorAll('#catalog-list button')].find(el=>el.textContent.includes('Автотест обогащённого продукта')).click()`);
  await cdp.evaluate(`window.confirm=()=>true;document.querySelector('#catalog-verify').click()`);
  await waitFor(cdp, `document.querySelector('#catalog-form-notice')?.textContent.includes('Карточка проверена')`, 'card verification');
  await waitFor(cdp, `document.querySelector('#catalog-history-count')?.textContent === '3'`, 'complete audit history');
  await waitFor(cdp, `document.querySelectorAll('#catalog-version-list .catalog-version').length === 3`, 'complete version history');
  assert.equal(await cdp.evaluate(`document.querySelector('#catalog-card-badge').textContent`), 'verified');
  assert.equal(await cdp.evaluate(`document.querySelector('#catalog-enrichment-status').disabled`), true);
  assert.match(await cdp.evaluate(`document.querySelector('#catalog-history-list').textContent`), /Карточка опубликована/);
  const versionText=await cdp.evaluate(`document.querySelector('#catalog-version-list').textContent`);
  assert.match(versionText, /Источник/);
  assert.match(versionText, /Статус/);
  assert.match(versionText, /Минералы · Кальций/);
  assert.match(versionText, /Добавлено · Витамин D/);
  assert.doesNotMatch(versionText, /\{"valuePer100g"/);
  assert.equal(await cdp.evaluate(`document.querySelectorAll('#catalog-history button, #catalog-history input, #catalog-history select, #catalog-history textarea').length`), 0, 'history must not expose mutation controls');
  process.stdout.write('catalog-admin-browser: passed\n');
} finally {
  cdp?.close();
  if (chrome && chrome.exitCode === null) {
    chrome.kill();
    await Promise.race([once(chrome, 'exit'), delay(2000)]);
  }
  if (mock.exitCode === null) {
    mock.kill();
    await Promise.race([once(mock, 'exit'), delay(1000)]);
  }
  await rm(profileDir, {recursive:true, force:true, maxRetries:10, retryDelay:100});
}
