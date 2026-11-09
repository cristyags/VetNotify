import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { api, evidence, get, login, receipt, runId, terminal } from '../tests/support/harness.mjs';
import { devOnly } from './runtime.mjs';

const run=runId('demo-cli');
const smoke=process.argv.includes('--smoke');
const report={title:'VetNotify · Dos clientes de consola',runId:run,start:new Date().toISOString(),cases:[]};
try{
  report.version=await api('/version');
  if(!smoke) await devOnly(report.version);
  const auth=await login();
  const results=[];
  for(const [client,event,recipient,user] of [
    ['agenda','cita-confirmada','luna','sofia'],['laboratorio','resultado-disponible','max','diego'],
  ]){
    const result=spawnSync(process.execPath,['dist-api/clients/'+client+'/index.js','--event',event,
      '--recipient',recipient,'--channel','both','--run',run,'--key',run+'-'+client],{encoding:'utf8',timeout:16000});
    assert.equal(result.status,0,'Emisor '+client+' falló');
    const emitted=JSON.parse(result.stdout);
    assert.equal(emitted.notifications.length,2);
    for(const {id} of emitted.notifications){
      await terminal(id,auth);
      const row=await get(id,auth);
      assert.equal(row.application_id,emitted.application);
      assert.equal(row.state,'delivered');
      if(row.channel==='email') assert.ok((await receipt(id,auth)).receipt_id);
      else assert.equal((await api('/me/inbox/'+id,{auth:await login(user)})).id,id);
      results.push({id,application:row.application_id,channel:row.channel,state:row.state});
    }
  }
  assert.equal(new Set(results.map(r=>r.application)).size,2);
  report.cases.push({name:'Emisores CLI',state:'pasó',summary:'Dos procesos y credenciales; cuatro IDs, dos recibos y dos avisos internos.',results});
  if(!smoke){
    const result=spawnSync(process.execPath,['tests/acceptance/run.mjs',...process.argv.slice(2)],
      {stdio:'inherit',env:process.env,timeout:510000});
    assert.equal(result.status,0,'Alguna prueba de aceptación falló');
  }
}catch(error){
  process.exitCode=1;
  report.cases.push({name:'Demo API',state:'falló',summary:error.message});
}finally{
  report.end=new Date().toISOString();
  await evidence(report);
}
