import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { api, evidence, poll, request, runId } from '../tests/support/harness.mjs';
import { desired, devOnly, running, scale } from './runtime.mjs';

devOnly();
const id=runId('sin-web');
const services=['web','agenda','laboratorio'];
const prior=Object.fromEntries(services.map(service=>[service,desired(service)]));
const report={title:'VetNotify · Demostración sin frontend',runId:id,start:new Date().toISOString(),cases:[]};
try{
  report.version=await api('/version');
  for(const service of services) if(prior[service]>0) scale(service,0);
  const front=await poll('web y adaptadores realmente detenidos',async()=>({
    replicas:services.map(running),http:(await request('/')).status,
  }),r=>r.replicas.every(n=>n===0)&&[502,503,504].includes(r.http),65000);
  const status=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--env-file-if-exists=.env','scripts/demo-api.mjs',...process.argv.slice(2)],
      {stdio:'inherit',timeout:520000});
    child.once('error',reject);
    child.once('close',resolve);
  });
  assert.equal(status,0,'Falló la demo de API');
  assert.ok(services.every(service=>running(service)===0));
  const apiVersion=await poll('versión por gateway tras la demo',()=>api('/version'),
    version=>version.commit===report.version.commit && version.image===report.version.image);
  report.cases.push({name:'USR-01',state:'pasó',summary:'Web y adaptadores a cero durante la demo. CLI y API por el mismo gateway.',
    previousReplicas:prior,observedWebStatus:front.http,webReplicasDuringTest:0,adapterReplicasDuringTest:0,apiVersion});
}catch(error){
  process.exitCode=1;
  report.cases.push({name:'USR-01',state:'falló',summary:error.message});
}finally{
  try {
    for(const service of [...services].reverse()) if(prior[service]>0) scale(service,prior[service]);
    await poll('réplicas restauradas',async()=>({
      replicas:services.map(running),http:(await request('/')).status,
    }),r=>r.replicas.every((n,i)=>n===prior[services[i]])&&(!prior.web||r.http===200),65000);
    report.restoredReplicas=Object.fromEntries(services.map(service=>[service,running(service)]));
  }catch(error){
    process.exitCode=1;
    report.cases.push({name:'Restauración',state:'falló',summary:error.message});
  }
  report.end=new Date().toISOString();
  await evidence(report);
}
