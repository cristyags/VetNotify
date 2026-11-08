import assert from 'node:assert/strict';
import { api, db as connect, evidence, expectStatus, machine, payload, poll, runId, send, terminal } from '../support/harness.mjs';
import { compose } from '../../scripts/local.mjs';

const run=runId('ttl');
const report={title:'VetNotify · Vencimiento atómico de idempotencia',runId:run,start:new Date().toISOString(),cases:[]};
const db=connect();
try{
  report.version=await api('/version');
  assert.equal(report.version.environment,'test');
  assert.equal((await api('/policy')).idempotencyTtlSeconds,2);
  const key=run;
  const body=payload(run);
  const original=expectStatus(await send(body,{key}),202);
  await poll('clave vencida por reloj PostgreSQL',async ()=>(await db.query(
    'SELECT expires_at<=clock_timestamp() AS expired FROM idempotency WHERE notification_id=$1',[original.id])).rows[0]?.expired,Boolean,7000,100);
  const active=expectStatus(await send(body,{key}),200);
  assert.equal(active.id,original.id);
  expectStatus(await send({...body,subject:'Aún no se puede reemplazar'},{key}),409);
  compose(['up','-d','worker-internal']);
  const auth=machine(0);
  assert.equal((await terminal(original.id,auth)).state,'delivered');
  const expired=expectStatus(await send(body,{key}),202);
  assert.notEqual(expired.id,original.id);
  await terminal(expired.id,auth);
  assert.equal((await api('/notifications/'+original.id,{auth})).state,'delivered');
  const {rows:[counts]}=await db.query(`SELECT count(*)::int AS originals,
    (SELECT count(*)::int FROM idempotency WHERE key=$1) AS keys FROM notifications WHERE run_id=$1`,[run]);
  assert.deepEqual(counts,{originals:2,keys:1});
  report.cases.push({name:'TTL',state:'pasó',summary:'A 2 s, replay mientras activo; nuevo ID al vencer y finalizar. Historial anterior conservado.',
    original:original.id,replacement:expired.id,counts});
}catch(error){
  report.cases.push({name:'TTL',state:'falló',summary:error.message});
  process.exitCode=1;
}finally{
  await db.end();
  report.end=new Date().toISOString();
  await evidence(report);
}
