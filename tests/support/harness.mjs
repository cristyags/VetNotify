import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

export const base = process.env.API_URL ?? 'http://localhost:'+ (process.env.VET_PORT ?? '18080');
export const prom = process.env.PROM_URL ?? 'http://localhost:'+(process.env.PROM_PORT ?? '19090');
export const jaeger = process.env.JAEGER_URL ?? 'http://localhost:'+(process.env.JAEGER_PORT ?? '16686');
export const keys = [process.env.AGENDA_KEY, process.env.LAB_KEY];
export const origin = new URL(base).origin;
export const runId = (prefix = 'test') => prefix+'-'+Date.now().toString(36)+'-'+randomUUID().slice(0,8);
export const db = () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    `postgresql://vetnotify:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.PG_PORT ?? '15432'}/vetnotify`,
    connectionTimeoutMillis: 3000, statement_timeout: 4000, max: 5 });
  pool.on('error', () => { /* Lost idle connections are expected in the restart test. */ });
  return pool;
};

export async function request(path, { method = 'GET', body, auth, key, headers: extra, baseUrl = base } = {}) {
  const headers = { ...auth, ...extra };
  if (key) headers['idempotency-key'] = key;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(new URL(path, baseUrl), { method, headers,
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(7500), redirect:'error' });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { status: response.status, data, headers: response.headers, text };
}

export function expectStatus(result, ...statuses) {
  assert.ok(statuses.includes(result.status), `HTTP ${result.status} (${result.data?.code ?? 'sin código'}) · se esperaba ${statuses.join('/')}`);
  return result.data;
}
export const api = async (path, options, ...status) => expectStatus(await request('/api/v1'+path, options), ...(status.length ? status : [200]));
export const machine = index => ({ authorization: 'Bearer '+keys[index] });

export async function login(username = 'operador') {
  const password = process.env[{ operador:'OPERATOR_PASSWORD',sofia:'SOFIA_PASSWORD',diego:'DIEGO_PASSWORD' }[username]];
  assert.ok(password, 'Falta credencial de '+username);
  const response = await request('/api/v1/auth/login', { method:'POST', body:{username,password}, headers:{origin} });
  const user = expectStatus(response,200);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie && user.csrfToken, 'Sesión y CSRF disponibles');
  assert.match(response.headers.get('set-cookie'),/HttpOnly/i);
  if (origin.startsWith('https:')) assert.match(response.headers.get('set-cookie'),/; Secure/i);
  return { cookie, 'x-csrf-token': user.csrfToken, origin };
}

export function payload(run, channel='internal', recipient='luna', fields={}) {
  return { recipient: {id:recipient}, channel, subject:'Cita veterinaria de prueba',
    body:'Datos sintéticos de VetNotify.', metadata:{event:'cita-confirmada',pet:recipient === 'luna' ? 'Luna' : 'Max'},
    runId:run, ...fields };
}

export function send(body, { app=0, key, auth=machine(app), baseUrl } = {}) {
  return request('/api/v1/notifications', { method:'POST', auth, body, key, baseUrl });
}

export const get = (id,auth) => api('/notifications/'+id,{auth});
export const attempts = (id,auth) => api('/notifications/'+id+'/attempts',{auth});
export const receipt = (id,auth) => api('/admin/receipts/'+id,{auth});

export async function poll(label, query, condition, timeout = 25000, interval = 180) {
  const end = Date.now()+timeout;
  let lastError;
  while (Date.now() < end) {
    try {
      const value = await query();
      if (condition(value)) return value;
      lastError = undefined;
    } catch (error) { lastError = error; }
    await sleep(interval);
  }
  throw new Error('Tiempo agotado: '+label+(lastError ? ' · '+lastError.message : ''));
}

export const terminal = (id, auth) => poll('estado final '+id, () => get(id,auth), n => ['delivered','failed'].includes(n.state));
export function setProfile(auth, id, mode) {
  return api('/admin/faults/'+id, { method:'PUT', auth, body: mode },204);
}
export async function withProfile(auth,id,profile,work) {
  const previous = await api('/admin/faults/'+id,{auth});
  const started=Date.now();
  try {
    await setProfile(auth,id,profile);
    return await work(previous);
  } finally {
    const expiresIn = previous.expiresIn - Math.ceil((Date.now()-started)/1000);
    const restored = previous.mode === 'healthy' || expiresIn <= 0 ? {mode:'healthy'} :
      { mode:previous.mode, ...(previous.firstN ? {firstN:previous.firstN} : {}),
        ...(previous.addressPrefix ? {addressPrefix:previous.addressPrefix} : {}), expiresIn };
    await setProfile(auth,id,restored);
  }
}
export async function concurrent(tasks) {
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const contenders = tasks.map(async task => { await barrier; return task(); });
  release();
  return Promise.all(contenders);
}

export async function evidence(report) {
  const dir = process.env.EVIDENCE_DIR ?? 'docs/evidence';
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,report.runId+'.json'),JSON.stringify(report,null,2)+'\n');
  const lines = [`# ${report.title}`, '', `Ejecución \`${report.runId}\` de ${report.start} a ${report.end} (UTC).`, '',
    `Entorno \`${report.version?.environment ?? 'desconocido'}\`, commit \`${report.version?.commit ?? 'desconocido'}\`.`,
    '', '| Caso | Estado | Comprobación |', '|---|---|---|',
    ...report.cases.map(c=>`| ${c.name} | ${c.state} | ${String(c.summary ?? '').replaceAll('|','/').replace(/\s+/g,' ')} |`), '',
    `[Informe JSON](./${report.runId}.json)`, ''];
  await writeFile(join(dir,report.runId+'.md'),lines.join('\n'));
  console.log('Evidencia: '+join(dir,report.runId+'.json'));
}
