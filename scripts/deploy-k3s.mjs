import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const target=process.argv[2];
if(!['dev','prod'].includes(target) || !process.env.KUBECONFIG) throw new Error('Usa dev|prod con KUBECONFIG dedicado a VetNotify');
const namespace='vetnotify-'+target;
const origin=new URL(process.env.PUBLIC_ORIGIN ?? 'http://localhost:28080').origin;
if(target==='prod' && !origin.startsWith('https://')) throw new Error('Producción requiere un origen HTTPS');
if(target==='prod' && process.env.VET_PROD_BOOTSTRAP!=='approved') throw new Error('El bootstrap productivo requiere autorización');
const overlay='infra/k8s/overlays/'+target;
const backend=process.env.BACKEND_IMAGE ?? 'vetnotify-backend:local';
const web=process.env.WEB_IMAGE ?? 'vetnotify-web:local';
const local=process.env.VET_LOCAL_CLUSTER==='true';
if(!local && ![backend,web].every(x=>/@sha256:[0-9a-f]{64}$/.test(x))) throw new Error('Indica imágenes por digest inmutable');

function kubectl(args, {input,capture=false,timeout=100000,sensitive=false}={}) {
  const result=spawnSync('kubectl',args,{encoding:'utf8',input,timeout,maxBuffer:3_000_000,
    stdio:[input===undefined?'inherit':'pipe',capture?'pipe':'inherit',sensitive?'pipe':'inherit']});
  if(result.status!==0) throw new Error('kubectl '+args[0]+' falló'+(sensitive?' (datos protegidos)':''));
  return result.stdout;
}
const nodes=JSON.parse(kubectl(['get','nodes','-o','json'],{capture:true})).items;
if(!local && !nodes.some(node=>/^vetnotify-[a-z0-9]+$/.test(node.metadata.name))) {
  throw new Error('El clúster seleccionado no tiene un nodo VetNotify');
}
function value(key) {
  const val=process.env[key];
  if(!val || !/^[\w-]{32,128}$/.test(val)) throw new Error('Credencial inválida o ausente: '+key);
  return val;
}
const password=value('POSTGRES_PASSWORD');
const setupSecrets={
  database:{password,url:'postgresql://vetnotify:'+password+'@postgres:5432/vetnotify'},
  agenda:{key:value('AGENDA_KEY')},laboratorio:{key:value('LAB_KEY')},
  adapter:{key:value('ADAPTER_KEY')},simulator:{key:value('SIMULATOR_KEY')},
  grafana:{password:value('GRAFANA_PASSWORD')},
  seed:Object.fromEntries(['DISABLED_KEY','OPERATOR_PASSWORD','SOFIA_PASSWORD','DIEGO_PASSWORD'].map(k=>[k,value(k)])),
};

kubectl(['apply','-f',overlay+'/namespace.yaml']);
for(const [name,stringData] of Object.entries(setupSecrets)){
  const secret={apiVersion:'v1',kind:'Secret',type:'Opaque',metadata:{name:'vetnotify-'+name,namespace},stringData};
  kubectl(['apply','--server-side','--field-manager=vetnotify-bootstrap','-f','-'],{input:JSON.stringify(secret),sensitive:true});
}
const rendered=kubectl(['kustomize',overlay],{capture:true})
  .replaceAll('vetnotify-backend:local',backend)
  .replaceAll('vetnotify-web:local',web)
  .replace(/^(  PUBLIC_ORIGIN: ).*$/m,'$1'+JSON.stringify(origin))
  .replace(/^(  IMAGE_REF: ).*$/m,'$1'+JSON.stringify(backend));
kubectl(['apply','-f','-'],{input:rendered});
kubectl(['-n',namespace,'rollout','status','statefulset/postgres','--timeout=150s'],{timeout:160000});
const jobName='db-setup-'+randomBytes(4).toString('hex');
const envFrom=(name,secret,key)=>({name,valueFrom:{secretKeyRef:{name:'vetnotify-'+secret,key}}});
const job={apiVersion:'batch/v1',kind:'Job',metadata:{name:jobName,namespace},
  spec:{ttlSecondsAfterFinished:1800,backoffLimit:1,template:{metadata:{labels:{app:'db-setup'}},spec:{
    restartPolicy:'Never',automountServiceAccountToken:false,serviceAccountName:'vetnotify-app',
    securityContext:{seccompProfile:{type:'RuntimeDefault'}},containers:[{
      name:'setup',image:backend,imagePullPolicy:'IfNotPresent',
      securityContext:{runAsNonRoot:true,runAsUser:1000,runAsGroup:1000,allowPrivilegeEscalation:false,capabilities:{drop:['ALL']}},
      resources:{requests:{cpu:'20m',memory:'48Mi'},limits:{cpu:'500m',memory:'196Mi'}},
      command:['sh','-ec','node dist-api/scripts/migrate.js && node dist-api/scripts/seed.js'],
      env:[envFrom('DATABASE_URL','database','url'),envFrom('AGENDA_KEY','agenda','key'),envFrom('LAB_KEY','laboratorio','key'),
        ...Object.keys(setupSecrets.seed).map(k=>envFrom(k,'seed',k))]
    }],
  }}}};
kubectl(['apply','-f','-'],{input:JSON.stringify(job)});
kubectl(['-n',namespace,'wait','--for=condition=complete','job/'+jobName,'--timeout=160s'],{timeout:170000});
kubectl(['-n',namespace,'logs','job/'+jobName]);
for(const deployment of ['api','worker-email','worker-internal','simulator','agenda','laboratorio','gateway','web',
  'collector','jaeger','prometheus','grafana','node-exporter','probe']){
  kubectl(['-n',namespace,'rollout','status','deployment/'+deployment,'--timeout=120s'],{timeout:130000});
}
if(process.env.VET_DEV_DB_FORWARD==='true' && target==='dev') {
  const access={apiVersion:'v1',kind:'Service',metadata:{name:'verification-postgres',namespace},spec:{
    type:'NodePort',selector:{app:'postgres'},ports:[{name:'postgres',port:5432,targetPort:5432,nodePort:31432}],
  }};
  kubectl(['apply','-f','-'],{input:JSON.stringify(access)});
}
console.log('Despliegue verificado: '+namespace+' · '+origin);
