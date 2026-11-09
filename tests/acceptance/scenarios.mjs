import assert from 'node:assert/strict';
import { api, attempts, concurrent, expectStatus, get, login, machine, payload, receipt, request,
  send, terminal, withProfile } from '../support/harness.mjs';

export async function load100(auth, db, run) {
  return withProfile(auth,run,{ mode:'fail_first_n',firstN:2,addressPrefix:'retry-' },async () => {
    const records=[];
    for (const app of [0,1]) {
      for (const channel of ['internal','email']) {
        for (let i=0; i<25; i++) {
          const special = channel==='email' && app===0 ? i<5 ? 'retry-' : i<10 ? 'reject-' : '' : '';
          const id = app===0 ? 'luna' : 'max';
          const body = payload(run,channel,id,{ subject:`Lote ${app+1} · ${channel} · ${i+1}`,
            recipient:{id,...(special ? {email:special+i+'@example.test'} : {})} });
          records.push({ app,channel,special,body,key:run+'-'+app+'-'+channel+'-'+i });
        }
      }
    }
    for (let i=0;i<records.length;i+=10) {
      await Promise.all(records.slice(i,i+10).map(async item => {
        const res = await send(item.body,item);
        const accepted=expectStatus(res,202);
        assert.match(res.headers.get('location'),new RegExp(accepted.id+'$'));
        item.id=accepted.id;
      }));
    }
    assert.equal(new Set(records.map(item=>item.id)).size,100);
    const recipientAuth = [await login('sofia'),await login('diego')];
    const observe = async item => {
      const n=await terminal(item.id,auth);
      assert.equal(n.application_id,item.app===0?'agenda-veterinaria':'laboratorio-veterinario');
      assert.equal(n.channel,item.channel);
      assert.equal(n.state,item.special==='reject-'?'failed':'delivered');
      assert.equal(n.attempt_count,item.special==='retry-'?3:1);
      const timeline=await api('/notifications/'+n.id+'/transitions',{auth});
      assert.deepEqual(timeline.slice(0,3).map(t=>t.to_state),['accepted','pending','processing']);
      if (item.channel==='internal') {
        const inbox=await api('/me/inbox/'+n.id,{auth:recipientAuth[item.app]});
        assert.equal(inbox.id,n.id);
      } else {
        const provider=await receipt(n.id,auth);
        assert.equal(provider.calls,n.attempt_count);
        assert.equal(Boolean(provider.receipt_id),n.state==='delivered');
      }
      return { id:n.id,app:n.application_id,channel:n.channel,state:n.state,attempts:n.attempt_count,
        correlationId:n.correlation_id,traceId:n.trace_id,acceptedAt:n.accepted_at,deliveredAt:n.delivered_at };
    };
    const observations=[];
    for(let i=0;i<records.length;i+=10) {
      observations.push(...await Promise.all(records.slice(i,i+10).map(observe)));
    }
    const { rows:[persisted] }=await db.query(`SELECT count(n.id)::int AS notifications,
      count(j.notification_id)::int AS jobs,count(i.notification_id)::int AS inbox,
      count(d.receipt_id)::int AS receipts FROM notifications n JOIN jobs j ON j.notification_id=n.id
      LEFT JOIN inbox i ON i.notification_id=n.id LEFT JOIN simulator_deliveries d ON d.notification_id=n.id
      WHERE n.run_id=$1 AND n.creation_kind='initial'`,[run]);
    assert.deepEqual(persisted,{notifications:100,jobs:100,inbox:50,receipts:45});
    const stats=await api('/stats?runId='+run,{auth});
    assert.equal(stats.total,100);
    const groups=Object.fromEntries(stats.groups.map(g=>[g.channel+'-'+g.state,g.count]));
    assert.deepEqual(groups,{'email-delivered':45,'email-failed':5,'internal-delivered':50});
    return { summary:'100 IDs y trabajos; 95 entregadas, 5 fallidas; 50 efectos internos y 45 recibos.',
      run, persisted, groups, observations };
  });
}

export async function degradation(auth, run) {
  const temporary = await withProfile(auth,run+'-retry',{mode:'fail_first_n',firstN:2},async () => {
    const id=expectStatus(await send(payload(run+'-retry','email')),202).id;
    assert.equal((await terminal(id,auth)).state,'delivered');
    const tries=await attempts(id,auth);
    assert.deepEqual(tries.map(x=>x.code),['provider_http_503','provider_http_503','provider_accepted']);
    assert.equal((await receipt(id,auth)).calls,3);
    return {id,tries};
  });
  return withProfile(auth,run,{mode:'always_503'},async () => {
    const id=expectStatus(await send(payload(run,'email')),202).id;
    const inside=expectStatus(await send(payload(run,'internal')),202).id;
    assert.equal((await terminal(inside,auth)).state,'delivered');
    assert.ok(['pending','processing'].includes((await get(id,auth)).state),'Correo aún degradado mientras entrega interna');
    assert.equal((await terminal(id,auth)).state,'failed');
    const tries=await attempts(id,auth);
    assert.deepEqual(tries.map(x=>x.code),Array(3).fill('provider_http_503'));
    assert.equal((await receipt(id,auth)).calls,3);
    const waits=tries.slice(1).map((t,i)=>Date.parse(t.started_at)-Date.parse(tries[i].finished_at));
    assert.ok(waits[0]>=1900 && waits[1]>=3900);
    return {summary:'503/503/éxito y 503 sostenido con tres llamadas; la bandeja entregó durante el fallo.',
      id,inside,temporary,tries,waits};
  });
}

async function counts(db,id) {
  return (await db.query(`SELECT
    (SELECT count(*)::int FROM notifications WHERE id=$1) AS notifications,
    (SELECT count(*)::int FROM jobs WHERE notification_id=$1) AS jobs,
    (SELECT count(*)::int FROM attempts WHERE notification_id=$1) AS attempts,
    (SELECT count(*)::int FROM inbox WHERE notification_id=$1) AS inbox`,[id])).rows[0];
}

export async function idempotency(auth,db,run) {
  const body=payload(run);
  const serialKey=run+'-serial';
  const first=expectStatus(await send(body,{key:serialKey}),202);
  const sequential=[];
  for(let i=0;i<5;i++){
    const replay=expectStatus(await send({...body,metadata:{pet:'Luna',event:'cita-confirmada'},runId:run+'-transport'},{key:serialKey}),200);
    assert.ok(replay.replay);
    assert.equal(replay.id,first.id);
    sequential.push(replay.id);
  }
  const key=run+'-race';
  const results=await concurrent(Array.from({length:6},()=>()=>send(body,{key})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,200,200,200,200,202]);
  assert.equal(new Set(results.map(r=>r.data.id)).size,1);
  const id=results[0].data.id;
  for (const n of [id,first.id]) {
    await terminal(n,auth);
    assert.deepEqual(await counts(db,n),{ notifications:1,jobs:1,attempts:1,inbox:1 });
  }
  expectStatus(await send({...body,subject:'Contenido diferente'},{key}),409);
  const alternatives=await concurrent([
    ()=>send(body,{key:run+'-variant'}),
    ()=>send({...body,subject:'Otra variante'},{key:run+'-variant'}),
  ]);
  assert.deepEqual(alternatives.map(r=>r.status).sort(),[202,409]);
  const independent=await Promise.all([send(body,{app:1,key}),send({...body,channel:'email'},{key}),send(body),send(body)]);
  assert.ok(independent.every(r=>r.status===202));
  assert.equal(new Set([id,...independent.map(r=>r.data.id)]).size,5);
  const rows=(await db.query(`SELECT count(*)::int AS total FROM notifications WHERE run_id=$1`,[run])).rows[0];
  assert.equal(rows.total,7);
  const ttl=await api('/policy');
  assert.equal(ttl.idempotencyTtlSeconds,86400);
  const { rows:[timing] }=await db.query(`SELECT extract(epoch FROM i.expires_at-n.accepted_at)::float8 AS seconds
    FROM idempotency i JOIN notifications n ON n.id=i.notification_id WHERE n.id=$1`,[first.id]);
  assert.ok(Math.abs(timing.seconds-86400)<0.001);
  return {summary:'5 replays en cada prueba; un trabajo y efecto por clave. Carrera conflictiva 202/409 y espacios independientes.',
    sequentialId:first.id,sequential,concurrentId:id,codes:results.map(r=>r.status),persisted:rows.total,ttl};
}

export async function security(auth,db,run) {
  const body=payload(run);
  const unknown={authorization:'Bearer '+'x'.repeat(43)};
  const disabled={authorization:'Bearer '+process.env.DISABLED_KEY};
  for(const invalid of [{},unknown,disabled]) expectStatus(await send(body,{auth:invalid}),401);
  expectStatus(await send({...body,applicationId:'laboratorio-veterinario'}),403);
  expectStatus(await send({...body,recipient:{id:'nadie'}}),400);
  expectStatus(await send({...body,channel:'email',recipient:{id:'luna',email:'correo-invalido'}}),400);
  expectStatus(await send({...body,channel:'email',recipient:{id:'luna',email:'test@gmail.com'}}),400);
  expectStatus(await send({...body,metadata:{mode:'always_503'}}),400);
  const n=expectStatus(await send(body),202);
  await terminal(n.id,auth);
  const sofia=await login('sofia');
  const diego=await login('diego');
  expectStatus(await request('/api/v1/notifications/'+n.id,{auth:machine(1)}),404);
  expectStatus(await request('/api/v1/notifications/'+n.id,{auth:diego}),403);
  await api('/me/inbox/'+n.id,{auth:sofia});
  expectStatus(await request('/api/v1/me/inbox/'+n.id,{auth:diego}),404);
  expectStatus(await request('/api/v1/admin/faults/'+run,{auth:sofia}),403);
  const fakeRole=await request('/api/v1/demo/agenda-veterinaria/events',{method:'POST',auth:sofia,
    headers:{'x-role':'admin'},body:{event:'cita-confirmada',recipientId:'luna',channels:['internal'],requestId:run}});
  expectStatus(fakeRole,403);
  const logout=await request('/api/v1/auth/logout',{method:'POST',auth:{cookie:diego.cookie}});
  expectStatus(logout,403);
  expectStatus(await request('/api/v1/auth/logout',{method:'POST',auth:diego,headers:{origin:'https://untrusted.example.test'}}),403);
  await api('/auth/logout',{method:'POST',auth:diego},204);
  expectStatus(await request('/api/v1/auth/me',{auth:diego}),401);
  const { rows:[only] }=await db.query('SELECT count(*)::int AS total FROM notifications WHERE run_id=$1',[run]);
  assert.equal(only.total,1);
  return { summary:'401/403/404, CSRF, origen, revocación y cero escrituras por entradas inválidas.',id:n.id };
}

export async function manualAndAmbiguous(auth,db,run) {
  const ambiguous = await withProfile(auth,run+'-ambiguous',{mode:'accepted_then_timeout'},async () => {
    const n=expectStatus(await send(payload(run+'-ambiguous','email')),202);
    assert.equal((await terminal(n.id,auth)).state,'delivered');
    const tries=await attempts(n.id,auth);
    const provider=await receipt(n.id,auth);
    assert.deepEqual(tries.map(t=>t.outcome),['uncertain','delivered']);
    assert.equal(tries[0].code,'provider_timeout');
    assert.equal(tries[1].receipt_id,provider.receipt_id);
    assert.deepEqual(provider.history.map(row=>row.result),['accepted_response_delayed','deduplicated']);
    return { id:n.id,tries,provider };
  });
  const original=await withProfile(auth,run,{mode:'always_503'},async ()=>{
    const n=expectStatus(await send(payload(run,'email'),{key:run}),202);
    assert.equal((await terminal(n.id,auth)).state,'failed');
    return n;
  });
  const recipient=await login('sofia');
  const path='/api/v1/notifications/'+original.id+'/reprocess';
  const reason={reason:'Se restauró la conexión del simulador'};
  const command={method:'POST',auth,body:reason,key:run+'-manual'};
  expectStatus(await request(path,{...command,auth:recipient}),403);
  expectStatus(await request(path,{...command,auth:{cookie:auth.cookie}}),403);
  const results=await concurrent([()=>request(path,command),()=>request(path,command),()=>request(path,command)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,200,202]);
  const id=results[0].data.id;
  assert.ok(results.every(r=>r.data.id===id && r.data.parentId===original.id && r.data.rootId===original.id));
  expectStatus(await request(path,{...command,body:{reason:'Otra decisión'}}),409);
  expectStatus(await request(path,{...command,key:run+'-branch'}),409);
  const derived=await terminal(id,auth);
  assert.equal(derived.state,'delivered');
  assert.equal(derived.reprocess.actor,'operador');
  assert.equal(derived.chain.length,2);
  assert.equal((await get(original.id,auth)).state,'failed');
  assert.equal((await attempts(original.id,auth)).length,3);
  assert.equal((await attempts(id,auth)).length,1);
  const replay=expectStatus(await send(payload(run,'email'),{key:run}),200);
  assert.equal(replay.id,original.id);
  const {rows:[audit]}=await db.query(`SELECT count(*)::int AS total FROM audit_log WHERE action='manual_reprocess'
    AND details->>'sourceId'=$1`,[original.id]);
  assert.equal(audit.total,1);
  expectStatus(await request('/api/v1/notifications/'+id+'/reprocess',command),409);
  return {summary:'Timeout ambiguo deduplicado por simulador; reproceso autorizado crea una sola derivada auditada.',
    id,original:original.id,ambiguous,chain:derived.chain};
}

export async function cohortSemantics(db,run) {
  const {rows:[row]}=await db.query(`WITH clock AS (SELECT statement_timestamp() AS t)
    SELECT count(*)::int AS pending FROM notifications n,clock WHERE n.run_id=$1
      AND n.creation_kind='initial' AND n.state IN ('pending','processing') AND n.accepted_at<clock.t-interval '30 seconds'`,[run]);
  assert.equal(row.pending,0,'La corrida terminó sin pendientes vencidos');
  return row;
}
