import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { api, evidence, poll, request, runId } from '../tests/support/harness.mjs';
import { desired, devOnly, running, scale } from './runtime.mjs';

devOnly();
const id=runId('sin-web');
const prior=desired('web');
const report={title:'VetNotify · Demostración sin frontend',runId:id,start:new Date().toISOString(),cases:[]};
try{
  report.version=await api('/version');
  if(prior>0) scale('web',0);
  await poll('web realmente detenida',async()=>({replicas:running('web'),http:(await request('/')).status}),
    r=>r.replicas===0 && [502,503,504].includes(r.http),45000);
  const front=await request('/');
  const result=spawnSync(process.execPath,['--env-file-if-exists=.env','scripts/demo-api.mjs',...process.argv.slice(2)],
    {stdio:'inherit',env:process.env,timeout:520000});
  assert.equal(result.status,0,'Falló la demo de API');
  assert.equal(running('web'),0);
  report.cases.push({name:'USR-01',state:'pasó',summary:'Web a cero durante la demo, API y backend por el mismo gateway.',
    previousReplicas:prior,observedWebStatus:front.status,webReplicasDuringTest:0,apiVersion:await api('/version')});
}catch(error){
  process.exitCode=1;
  report.cases.push({name:'USR-01',state:'falló',summary:error.message});
}finally{
  try {
    if(prior>0){
      scale('web',prior);
      await poll('web restaurada',async()=>({replicas:running('web'),http:(await request('/')).status}),
        r=>r.replicas===prior && r.http===200,50000);
    }
    report.restoredReplicas=running('web');
  }catch(error){
    process.exitCode=1;
    report.cases.push({name:'Restauración',state:'falló',summary:error.message});
  }
  report.end=new Date().toISOString();
  await evidence(report);
}
