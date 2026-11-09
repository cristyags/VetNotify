import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { api, attempts, evidence, expectStatus, get, jaeger, login, payload, poll, prom,
  receipt, runId, send, terminal, withProfile } from '../tests/support/harness.mjs';
import { captureLogs, devOnly } from './runtime.mjs';

const now=()=>new Date().toISOString();
async function signal(base,path) {
  const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(4000),redirect:'error'});
  if(!response.ok) throw new Error('Señal no disponible: HTTP '+response.status);
  return response.json();
}
const query=expr=>signal(prom,'/api/v1/query?query='+encodeURIComponent(expr));
const alert=async ()=> (await signal(prom,'/api/v1/alerts')).data.alerts
  .filter(x=>x.labels.alertname==='VetNotifyDeliveryDegraded' && x.labels.channel==='email');
async function snapshot() {
  const expressions=['vetnotify_final_2m','vetnotify_queue_jobs','vetnotify_retries_total','vetnotify_sli_population',
    'vetnotify_sli_good','vetnotify_probe_good_total','vetnotify_probe_started_total','vetnotify_api_resident_memory_bytes',
    'node_memory_MemAvailable_bytes','1-avg(rate(node_cpu_seconds_total{mode="idle"}[2m]))'];
  const samples=await Promise.all(expressions.map(query));
  return { at:now(), values:Object.fromEntries(samples.map((x,i)=>[expressions[i],x.data.result])) };
}
export async function incident(auth,run) {
  devOnly();
  await poll('Prometheus listo',()=>query('vetnotify_final_2m'),x=>x.data.result.length>0,45000);
  await poll('Alerta normal antes del incidente',alert,x=>x.length===0,145000,3000);
  const start=now();
  const baselineId=expectStatus(await send(payload(run+'-base','email')),202).id;
  assert.equal((await terminal(baselineId,auth)).state,'delivered');
  const before=await snapshot();
  const incidentStart=now();
  let inFlight;
  let firing;
  let degraded;
  const failed=await withProfile(auth,run,{mode:'always_503'},async previous=>{
    assert.equal(previous.mode,'healthy');
    const ids=[];
    for(let i=0;i<24;i+=8){
      const rows=await Promise.all(Array.from({length:8},(_,j)=>send(payload(run,'email','luna',
        {subject:'Incidente controlado · '+(i+j+1)}),{key:run+'-'+(i+j)})));
      ids.push(...rows.map(r=>expectStatus(r,202).id));
    }
    inFlight=expectStatus(await send(payload(run)),202).id;
    assert.equal((await terminal(inFlight,auth)).state,'delivered');
    assert.ok(['pending','processing'].includes((await get(ids[0],auth)).state));
    const states=await Promise.all(ids.map(id=>terminal(id,auth)));
    assert.ok(states.every(n=>n.state==='failed' && n.attempt_count===3));
    firing=await poll('alerta de entrega firing',alert,x=>x.some(a=>a.state==='firing'),65000,2000);
    degraded=await snapshot();
    return ids;
  });
  const restoredAt=now();
  assert.equal((await api('/admin/faults/'+run,{auth})).mode,'healthy');
  const afterId=expectStatus(await send(payload(run+'-restored','email')),202).id;
  assert.equal((await terminal(afterId,auth)).state,'delivered');
  const chosen=await get(failed[0],auth);
  const timeline=await api('/notifications/'+chosen.id+'/transitions',{auth});
  const tries=await attempts(chosen.id,auth);
  const provider=await receipt(chosen.id,auth);
  assert.ok(tries.every(a=>a.code==='provider_http_503'));
  assert.equal(provider.calls,tries.length);
  assert.ok(chosen.trace_id,'Se guardó el contexto de la traza');
  const trace=await poll('traza consultable por ID',()=>signal(jaeger,'/api/traces/'+chosen.trace_id),
    x=>x.data?.[0]?.spans?.filter(s=>s.operationName==='notification.deliver').length===3,35000,1000);
  const observed=trace.data[0];
  const services=Object.values(observed.processes).map(p=>p.serviceName);
  for(const service of ['vetnotify-api','vetnotify-worker-email','vetnotify-email-simulator']) assert.ok(services.includes(service));
  const logs=captureLogs(start,[chosen.id,baselineId,afterId,inFlight]);
  assert.ok(logs.some(l=>l.trace_id===chosen.trace_id && l.operation==='acceptance'));
  assert.ok(logs.some(l=>l.trace_id===chosen.trace_id && l.operation==='attempt_finished'));
  await poll('alerta regresó a normal',alert,x=>x.length===0,150000,3000);
  const after=await snapshot();
  const derived=await api('/notifications/'+chosen.id+'/reprocess',{method:'POST',auth,key:run+'-restore',
    body:{reason:'Proveedor de prueba restaurado tras el incidente'}},202);
  assert.equal((await terminal(derived.id,auth)).state,'delivered');
  assert.equal((await get(chosen.id,auth)).state,'failed');
  return {summary:'24 correos agotaron 3 intentos; canal interno disponible. Traza de 3 servicios, alerta firing y retorno normal.',
    hypothesis:'Un 503 sostenido afecta solo a correo, aumenta los reintentos y conserva las aceptaciones.',
    incidentStart,restoredAt,before,degraded,after,firing,resolvedAt:after.at,failed,baselineId,inFlight,afterId,
    manualDerivedId:derived.id, chosen:{id:chosen.id,correlationId:chosen.correlation_id,traceId:chosen.trace_id},
    timeline,tries,provider,logs,trace:{traceId:observed.traceID,services,spans:observed.spans.map(s=>({
      name:s.operationName,id:s.spanID,at:s.startTime,durationUs:s.duration,service:observed.processes[s.processID]?.serviceName,
      parents:s.references.map(x=>x.spanID),
    }))} };
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const id=runId('incidente');
  const report={title:'VetNotify · Incidente y recuperación',runId:id,start:now(),cases:[]};
  try{
    report.version=await api('/version');
    report.cases.push({name:'P1-5',state:'pasó',...await incident(await login(),id)});
  }catch(error){
    report.cases.push({name:'P1-5',state:'falló',summary:error.message});
    process.exitCode=1;
  }finally{
    report.end=now();
    await evidence(report);
  }
}
