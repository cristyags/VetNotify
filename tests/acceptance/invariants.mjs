import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { base, expectStatus, machine, payload, send } from '../support/harness.mjs';

export async function lostResponse(db,run) {
  const key=run;
  const body=payload(run);
  let committed=false;
  const relay=createServer(async(req,res)=>{
    for await (const _ of req) { /* Consume the request to emulate a caller-facing transport. */ }
    try {
      const upstream=await send(body,{key});
      committed=upstream.status===202;
    } finally {
      res.destroy();
    }
  });
  await new Promise((resolve,reject)=>relay.once('error',reject).listen(0,'127.0.0.1',resolve));
  try{
    await assert.rejects(fetch('http://127.0.0.1:'+relay.address().port,{
      method:'POST',body:JSON.stringify(body),headers:machine(0),redirect:'error',signal:AbortSignal.timeout(10000),
    }));
    assert.ok(committed,'La respuesta se perdió después del commit');
    const replay=expectStatus(await send(body,{key}),200);
    const {rows:[persisted]}=await db.query('SELECT id FROM notifications WHERE run_id=$1',[run]);
    assert.equal(replay.id,persisted.id);
    return {id:replay.id,location:new URL('/api/v1/notifications/'+replay.id,base).pathname};
  }finally{await new Promise(resolve=>relay.close(resolve));}
}

export async function cohortsWithPending(db) {
  const {cohorts}=await import('../../dist-api/packages/db/notifications.js');
  const client=await db.connect();
  const app='cohort-'+randomUUID().slice(0,8);
  const at='2020-01-02T00:00:00.000Z';
  const time=seconds=>new Date(Date.parse(at)+seconds*1000).toISOString();
  try{
    await client.query('BEGIN');
    await client.query('INSERT INTO applications VALUES($1,$1,false)',[app]);
    async function add(seconds,state,delivered,parent){
      const id=randomUUID();
      await client.query(`INSERT INTO notifications(id,application_id,recipient_id,channel,subject,body,metadata,
        accepted_at,delivered_at,state,correlation_id,creation_kind,parent_notification_id,root_notification_id)
        VALUES($1,$2,'luna','internal','Cohorte sintética','Solo durante prueba','{}',$3,$4,$5,$6,$7,$8,$9)`,
        [id,app,time(seconds),delivered===null?null:time(delivered),state,randomUUID(),
          parent?'manual_reprocess':'initial',parent??null,parent??id]);
      return id;
    }
    await add(-60,'pending',null);
    const failed=await add(-55,'failed',null);
    await add(-40,'delivered',-38,failed);
    await add(-50,'delivered',-48);
    await add(-30,'pending',null); // Right boundary excluded in the 30 s cohort.
    await add(-931,'delivered',-930);
    const rows=await cohorts(client,at);
    const delivery=rows.find(row=>row.application_id===app&&row.sli==='initial_30s');
    assert.equal(delivery.population,3);
    assert.equal(delivery.good,1);
    assert.equal(delivery.bad,2);
    assert.equal(delivery.error_budget,0);
    return {population:delivery.population,good:delivery.good,bad:delivery.bad,errorBudget:delivery.error_budget};
  }finally{
    await client.query('ROLLBACK');
    client.release();
  }
}
