import http from 'node:http';
import { randomUUID } from 'node:crypto';

const api = process.env.API_URL;
const key = process.env.AGENDA_KEY;
const environment = process.env.VET_ENV ?? 'local';
if (!api || !key) throw new Error('El probe requiere API_URL y AGENDA_KEY');
const totals = { started: 0, good: 0, failed: 0 };
async function sample() {
  totals.started++;
  const headers = { authorization: 'Bearer '+key, 'content-type': 'application/json' };
  try {
    const response = await fetch(new URL('/api/v1/notifications',api), {
      method:'POST', headers: {...headers, 'idempotency-key': randomUUID()}, redirect:'error',
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({ recipient:{id:'luna'}, channel:'internal', subject:'Sonda de disponibilidad',
        body:'Comprobación automatizada de aceptación durable.', runId:'probe', metadata:{event:'probe'} }),
    });
    const data = await response.json();
    if (![200,202].includes(response.status) || !/^[0-9a-f-]{36}$/.test(data.id)) throw new Error('reception');
    const detail = await fetch(new URL('/api/v1/notifications/'+data.id,api), {
      headers, signal: AbortSignal.timeout(4000), redirect:'error',
    });
    if (!detail.ok || (await detail.json()).id !== data.id) throw new Error('persistence');
    totals.good++;
  } catch { totals.failed++; }
}
http.createServer((req,res) => {
  if (req.url === '/health/live') { res.end('ok'); return; }
  if (req.url !== '/metrics') { res.writeHead(404).end(); return; }
  res.writeHead(200,{'content-type':'text/plain; version=0.0.4'});
  res.end(Object.entries(totals).map(([k,v]) =>
    '# TYPE vetnotify_probe_'+k+'_total counter\nvetnotify_probe_'+k+'_total{environment='+JSON.stringify(environment)+'} '+v).join('\n')+'\n');
}).listen(8080,'0.0.0.0');
void sample();
setInterval(sample,60_000);
