import assert from 'node:assert/strict';
import { api, evidence, expectStatus, get, login, payload, poll, runId, send, terminal } from '../tests/support/harness.mjs';
import { devOnly, kube } from './runtime.mjs';

if(process.env.VET_TARGET!=='k8s') throw new Error('Rollback requiere K3s de validación y KUBECONFIG dedicado.');
devOnly();
const id=runId('rollback');
const report={title:'VetNotify · Rollback de Deployment',runId:id,start:new Date().toISOString(),cases:[]};
let changed=false;
try{
  report.version=await api('/version');
  const auth=await login();
  const baseline=expectStatus(await send(payload(id)),202).id;
  await terminal(baseline,auth);
  const read=()=>JSON.parse(kube(['get','deployment/api','-o','json'],true));
  const original=read().spec.template.spec.containers[0].image;
  const broken='docker.io/library/nginx:vetnotify-intentionally-missing';
  kube(['set','image','deployment/api','api='+broken]);
  changed=true;
  const failure=await poll('ImagePullBackOff real',async()=>{
    const pods=JSON.parse(kube(['get','pod','-l','app=api','-o','json'],true)).items;
    return pods.filter(p=>p.spec.containers[0].image===broken).map(p=>({uid:p.metadata.uid,
      phase:p.status.phase, reason:p.status.containerStatuses?.[0]?.state?.waiting?.reason}));
  },rows=>rows.some(p=>['ErrImagePull','ImagePullBackOff'].includes(p.reason)),65000,1500);
  kube(['rollout','undo','deployment/api']);
  kube(['rollout','status','deployment/api','--timeout=120s']);
  changed=false;
  const after=await api('/version');
  assert.equal(after.commit,report.version.commit);
  assert.equal(read().spec.template.spec.containers[0].image,original);
  assert.equal((await get(baseline,auth)).state,'delivered');
  const verified=expectStatus(await send(payload(id)),202).id;
  assert.equal((await terminal(verified,auth)).state,'delivered');
  report.cases.push({name:'DEV-12',state:'pasó',summary:'Imagen inexistente detectada; rollback al digest anterior y dos operaciones verificadas.',
    failure,original,after,baseline,verified});
}catch(error){
  process.exitCode=1;
  report.cases.push({name:'DEV-12',state:'falló',summary:error.message});
}finally{
  if(changed){
    try{kube(['rollout','undo','deployment/api']);kube(['rollout','status','deployment/api','--timeout=120s']);}
    catch(error){report.cases.push({name:'Restauración',state:'falló',summary:error.message});}
  }
  report.end=new Date().toISOString();
  await evidence(report);
}
