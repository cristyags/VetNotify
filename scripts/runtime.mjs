import { compose } from './local.mjs';
import { poll, request } from '../tests/support/harness.mjs';
import { kubectlClient } from './kubectl-client.mjs';

const k8s=process.env.VET_TARGET==='k8s';
const namespace=process.env.VET_NAMESPACE ?? 'vetnotify-dev';
if (k8s && !/^vetnotify-(dev|prod)$/.test(namespace)) throw new Error('Namespace VetNotify obligatorio');
export const devOnly = () => {
  if (k8s && namespace!=='vetnotify-dev') throw new Error('La prueba de falla solo se ejecuta en vetnotify-dev');
};
export function kube(args, capture=false) {
  if (!process.env.KUBECONFIG&&!process.env.VET_SSH_TARGET) throw new Error('Indica un contexto o SSH dedicado a VetNotify');
  return kubectlClient(['-n',namespace,...args],{capture});
}

const replicas = service => JSON.parse(kube(['get','deployment',service,'-o','json'],true)).spec.replicas ?? 1;
export function scale(service,count) {
  if(k8s) kube(['scale','deployment/'+service,'--replicas='+count]);
  else if(count===0) compose(['--profile','web','stop',service]);
  else compose(['--profile','web','up','-d','--scale',service+'='+count,service]);
}
export function running(service) {
  if(k8s) return JSON.parse(kube(['get','pods','-l','app='+service,'-o','json'],true)).items.length;
  return compose(['ps','--status','running','-q',service],true).split(/\r?\n/).filter(Boolean).length;
}
export const desired = service => k8s ? replicas(service) : running(service);
export function stopDatabase() {
  if(k8s) kube(['scale','statefulset/postgres','--replicas=0']);
  else compose(['stop','postgres']);
}
export function startDatabase() {
  if(k8s) kube(['scale','statefulset/postgres','--replicas=1']);
  else compose(['up','-d','postgres']);
}
export function killWorker() {
  if(k8s) {
    const pods=JSON.parse(kube(['get','pods','-l','app=worker-email','-o','json'],true)).items;
    if(pods.length!==1) throw new Error('La prueba espera un único pod worker-email');
    const id=pods[0].metadata.uid;
    kube(['delete','pod',pods[0].metadata.name,'--grace-period=0','--force']);
    return id;
  }
  const id=compose(['ps','-q','worker-email'],true);
  compose(['kill','-s','SIGKILL','worker-email']);
  compose(['up','-d','worker-email']);
  return id;
}
export function restartApi() {
  if(k8s) {
    kube(['rollout','restart','deployment/api']);
    kube(['rollout','status','deployment/api','--timeout=80s']);
  } else compose(['restart','api']);
}
export async function readiness(expected) {
  const baseUrl=expected===503 ? process.env.VET_API_DIRECT : undefined;
  return poll('readiness '+expected, ()=>request('/health/ready',{baseUrl}), r=>r.status===expected,60000);
}
export function captureLogs(since, ids) {
  const output=[];
  if(k8s) {
    for(const name of ['api','worker-email','worker-internal','simulator']) {
      output.push(kube(['logs','-l','app='+name,'--all-containers','--since-time='+since,'--tail=-1'],true));
      // A restart within the same pod has an independent previous log stream.
      try { output.push(kube(['logs','-l','app='+name,'--previous','--since-time='+since,'--tail=-1'],true)); }
      catch { /* Previous container may be absent. */ }
    }
  } else output.push(compose(['logs','--no-color','--since',since,'api','worker-email','worker-internal','simulator'],true));
  return output.join('\n').split(/\r?\n/).flatMap(line => {
    const start=line.indexOf('{');
    if(start<0) return [];
    try {
      const row=JSON.parse(line.slice(start));
      return ids.includes(row.notification_id) ? [row] : [];
    } catch { return []; }
  }).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
}
