import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { api, attempts, db as connect, evidence, expectStatus, get, login, payload, poll, request, runId, send, terminal, withProfile } from '../tests/support/harness.mjs';
import { devOnly, killWorker, kube, readiness, restartApi, startDatabase, stopDatabase, workerRestarted } from './runtime.mjs';

export async function recover(auth,db,run) {
  await devOnly();
  if(process.env.VET_TARGET!=='k8s') return exerciseRecovery(auth,db,run);
  // Give kubelet and the remote administrative client a deterministic in-flight window.
  const deployments=['deployment/worker-email','deployment/simulator'];
  kube(['set','env',...deployments,'PROVIDER_TIMEOUT_MS=12000','LEASE_MS=18000']);
  try {
    for(const name of deployments) kube(['rollout','status',name,'--timeout=90s']);
    const result=await exerciseRecovery(auth,db,run);
    return {...result,controlledTiming:{providerTimeoutMs:12000,leaseMs:18000}};
  } finally {
    for(const name of deployments) {
      kube(['rollout','undo',name]);
      kube(['rollout','status',name,'--timeout=90s']);
    }
  }
}

async function exerciseRecovery(auth,db,run) {
  const key=run+'-original';
  const ids=[];
  let lease;
  let killed;
  await withProfile(auth,run,{mode:'timeout'},async ()=>{
    const rows=await Promise.all(Array.from({length:6},(_,i)=>send(payload(run,'email','luna',
      {subject:'Recuperación '+i}),{key:i===0?key:run+'-'+i})));
    for(const row of rows) ids.push(expectStatus(row,202).id);
    lease=await poll('hay lease activo y trabajo pendiente',async ()=>{
      const result=await db.query(`SELECT n.*,j.lease_token,j.attempt_count,j.max_attempts,a.id AS attempt_id
        FROM jobs j JOIN notifications n ON n.id=j.notification_id
        JOIN attempts a ON a.notification_id=n.id AND a.number=j.attempt_count
        WHERE n.run_id=$1 AND j.state='processing'
          AND EXISTS (SELECT 1 FROM jobs pending JOIN notifications p ON p.id=pending.notification_id
            WHERE p.run_id=$1 AND pending.state='pending') LIMIT 1`,[run]);
      return result.rows[0];
    },Boolean,7000,50);
    killed=killWorker();
  });
  const recovered=await Promise.all(ids.map(id=>terminal(id,auth)));
  assert.ok(recovered.every(n=>n.state==='delivered' && n.attempt_count<=3));
  if(killed?.method==='cri-stop') assert.ok(workerRestarted(killed),'Kubelet creó un proceso nuevo');
  const history=await attempts(lease.id,auth);
  assert.deepEqual(history.map(row=>row.number),[1,2]);
  assert.equal(history[0].code,'lease_expired');
  assert.equal(history[0].outcome,'uncertain');
  const {finish}=await import('../dist-api/apps/worker/src/queue.js');
  assert.equal(await finish(db,lease,'stale-worker',{outcome:'permanent',code:'should_not_overwrite'},{}),null);
  assert.equal((await get(lease.id,auth)).state,'delivered');

  // Disconnection is tested against the API while its process stays live.
  let gatewayDuringOutage;
  try {
    stopDatabase();
    await readiness(503);
    const response=await send(payload(run+'-db-unavailable'),{baseUrl:process.env.VET_API_DIRECT});
    expectStatus(response,503);
    if(process.env.VET_API_DIRECT) {
      const gateway=await poll('gateway retiró el API sin readiness',()=>request('/health/ready'),
        r=>[502,504].includes(r.status),45000,500);
      gatewayDuringOutage=gateway.status;
    }
  } finally {
    startDatabase();
    await readiness(200);
  }
  restartApi();
  await readiness(200);
  const replayResponse=await poll('replay por el gateway tras reinicio',
    ()=>send(payload(run,'email','luna',{subject:'Recuperación 0'}),{key}),
    response=>![502,503,504].includes(response.status));
  const replay=expectStatus(replayResponse,200);
  assert.equal(replay.id,ids[0]);
  const preserved=await Promise.all(ids.map(id=>terminal(id,auth)));
  assert.ok(preserved.every(n=>n.state==='delivered'));
  const { rows:[check] }=await db.query(`SELECT count(*)::int AS total FROM notifications WHERE run_id=$1`,[run+'-db-unavailable']);
  assert.equal(check.total,0);
  return {summary:'Worker terminado tras reclamar con pendientes; lease recuperado, token viejo rechazado y PostgreSQL/API reiniciados.',
    killed,ids,leaseNotification:lease.id,history,replayed:replay.id,postRestartStates:preserved.map(n=>n.state),
    gatewayDuringOutage,unavailableWrites:check.total};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const id=runId('recuperacion');
  const report={title:'VetNotify · Recuperación',runId:id,start:new Date().toISOString(),cases:[]};
  const db=connect();
  try{
    report.version=await devOnly();
    const result=await recover(await login(),db,id);
    report.cases.push({name:'P1-4',state:'pasó',...result});
  }catch(error){
    report.cases.push({name:'P1-4',state:'falló',summary:error.message});
    process.exitCode=1;
  }finally{
    await db.end();
    report.end=new Date().toISOString();
    await evidence(report);
  }
}
