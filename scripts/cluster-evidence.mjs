import assert from 'node:assert/strict';
import { api, evidence, poll, runId } from '../tests/support/harness.mjs';
import { kube, devOnly } from './runtime.mjs';
import { kubectlClient } from './kubectl-client.mjs';

if(process.env.VET_TARGET!=='k8s') throw new Error('Esta evidencia requiere K3s.');
devOnly();
const id=runId('k3s');
const report={title:'VetNotify · Evidencia operativa de K3s',runId:id,start:new Date().toISOString(),cases:[]};
const parse=(args)=>JSON.parse(kube([...args,'-o','json'],true));
let patched=false;
try{
  report.version=await api('/version');
  const ns=process.env.VET_NAMESPACE??'vetnotify-dev';
  const nodes=parse(['get','nodes']).items.map(n=>({name:n.metadata.name,version:n.status.nodeInfo.kubeletVersion,
    ready:n.status.conditions.find(c=>c.type==='Ready')?.status,allocatable:n.status.allocatable}));
  assert.ok(nodes.some(n=>n.ready==='True'));
  const pods=parse(['get','pods']).items.filter(p=>p.status.phase==='Running').map(p=>({
    name:p.metadata.name,uid:p.metadata.uid,
    containers:p.status.containerStatuses.map(c=>({name:c.name,ready:c.ready,restarts:c.restartCount,image:c.image,imageID:c.imageID})),
  }));
  assert.ok(pods.length>=12);
  const claims=parse(['get','pvc']).items.map(p=>({name:p.metadata.name,state:p.status.phase,size:p.status.capacity.storage,volume:p.spec.volumeName}));
  assert.ok(claims.length>=4 && claims.every(c=>c.state==='Bound'));
  const actor='--as=system:serviceaccount:'+ns+':vetnotify-release';
  const releaseCanPatch=kube(['auth','can-i','patch','deployment/api',actor],true);
  let releaseCannotReadSecrets=false;
  try{kube(['auth','can-i','get','secrets',actor],true);}
  catch{releaseCannotReadSecrets=true;}
  assert.equal(releaseCanPatch,'yes');
  assert.ok(releaseCannotReadSecrets);
  const cpu=kube(['top','pods','--containers'],true);
  report.cases.push({name:'DEV-09/10/11',state:'pasó',summary:'Nodo Ready, workloads por digest, PVC y capacidad observada. RBAC de release limita secretos.',
    nodes,pods,claims,cpu,releaseCanPatch,releaseCannotReadSecrets});
  if(process.argv.includes('--liveness')){
    const patch=[
      {op:'replace',path:'/spec/template/spec/containers/0/livenessProbe/httpGet/path',value:'/health/test-unhealthy'},
      {op:'replace',path:'/spec/template/spec/containers/0/livenessProbe/failureThreshold',value:1},
      {op:'replace',path:'/spec/template/spec/containers/0/livenessProbe/periodSeconds',value:3},
    ];
    // Stream the patch to avoid command-line quoting differences on Windows.
    kubectlClient(['-n',ns,'patch','deployment/worker-internal','--type=json','--patch-file=/dev/stdin'],
      {input:JSON.stringify(patch)});
    patched=true;
    const observed=await poll('Kubelet reinicia por liveness',async()=>{
      const candidates=parse(['get','pods','-l','app=worker-internal']).items;
      return candidates.find(p=>p.spec.containers[0].livenessProbe.httpGet.path==='/health/test-unhealthy' &&
        p.status.containerStatuses?.[0]?.restartCount>0);
    },Boolean,70000,1000);
    const events=parse(['get','events']).items.filter(e=>e.involvedObject?.uid===observed.metadata.uid)
      .map(e=>({at:e.lastTimestamp??e.eventTime,reason:e.reason,message:e.message}));
    assert.ok(events.some(e=>e.reason==='Unhealthy'&&/Liveness probe failed/.test(e.message)));
    kube(['rollout','undo','deployment/worker-internal']);
    kube(['rollout','status','deployment/worker-internal','--timeout=90s']);
    patched=false;
    report.cases.push({name:'Liveness',state:'pasó',summary:'El kubelet registró fallo de liveness y reinició el contenedor. Probe restaurada.',
      pod:observed.metadata.uid,restarts:observed.status.containerStatuses[0].restartCount,events});
  }
}catch(error){
  report.cases.push({name:'Operación K3s',state:'falló',summary:error.message});
  process.exitCode=1;
}finally{
  if(patched){
    try{kube(['rollout','undo','deployment/worker-internal']);kube(['rollout','status','deployment/worker-internal','--timeout=90s']);}
    catch(error){report.cases.push({name:'Restauración',state:'falló',summary:error.message});}
  }
  report.end=new Date().toISOString();
  await evidence(report);
}
