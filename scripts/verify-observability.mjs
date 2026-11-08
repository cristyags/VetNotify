import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { evidence, jaeger, poll, prom, runId } from '../tests/support/harness.mjs';
import { compose } from './local.mjs';
import { devOnly, kube } from './runtime.mjs';

devOnly();
const source=JSON.parse(await readFile(process.argv[2],'utf8'));
const incident=source.cases.find(c=>c.name==='P1-5'&&c.state==='pasó');
assert.ok(incident,'Se requiere evidencia P1-5 exitosa');
const grafana=process.env.GRAFANA_URL??'http://localhost:13000';
const password=process.env.GRAFANA_PASSWORD;
assert.ok(password,'Falta la credencial local de Grafana');
const traceId=incident.chosen.traceId;
const id=runId('senales');
const report={title:'VetNotify · Señales y persistencia de trazas',runId:id,version:source.version,start:new Date().toISOString(),cases:[]};
const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined});
try{
  const panelDir=join(process.env.EVIDENCE_DIR??'docs/evidence',source.version.environment==='dev'?'signals-azure':'signals-local');
  await mkdir(panelDir,{recursive:true});
  const page=await browser.newPage({viewport:{width:1440,height:1120}});
  const session=await page.request.post(grafana+'/login',{data:{user:'vetnotify',password}});
  assert.ok(session.ok(),'Grafana requiere inicio de sesión válido');
  const dashboard=await (await page.request.get(grafana+'/api/dashboards/uid/vetnotify-ops')).json();
  assert.ok(dashboard.dashboard.panels.length>=6);
  const targets=(await (await page.request.get(prom+'/api/v1/targets')).json()).data.activeTargets;
  assert.ok(targets.length>=3&&targets.every(t=>t.health==='up'));
  const routed=await page.request.get(grafana+'/api/datasources/proxy/uid/vet-jaeger/api/v3/traces/'+traceId);
  assert.ok(routed.ok()&&(await routed.json()).result.resourceSpans.length>=2,'Grafana puede consultar Jaeger con el datasource provisionado');
  await page.goto(grafana+'/d/vetnotify-ops');
  await page.getByText('Resultados durables por estado',{exact:true}).first().waitFor({timeout:20000});
  await page.screenshot({path:join(panelDir,'grafana.png'),animations:'disabled',fullPage:true});
  await page.goto(jaeger+'/trace/'+traceId);
  await page.getByText('vetnotify-worker-email',{exact:true}).first().waitFor({timeout:20000});
  await page.screenshot({path:join(panelDir,'jaeger.png'),animations:'disabled'});
  if(process.env.VET_TARGET==='k8s'){
    kube(['rollout','restart','deployment/jaeger']);
    kube(['rollout','status','deployment/jaeger','--timeout=90s']);
  }else compose(['restart','jaeger']);
  await poll('traza sigue disponible tras reiniciar',async()=>{
    const result=await fetch(jaeger+'/api/v3/traces/'+traceId,{signal:AbortSignal.timeout(3000)});
    return result.ok&&(await result.json()).result.resourceSpans.length>=2;
  },Boolean,60000,800);
  report.cases.push({name:'MET-03/04/05',state:'pasó',summary:'Dashboard provisionado, targets arriba y traza consultable por datasource y tras reinicio.',
    panels:dashboard.dashboard.panels.length,targets:targets.map(t=>({job:t.labels.job,status:t.health})),traceId});
}catch(error){
  report.cases.push({name:'MET-03/04/05',state:'falló',summary:error.message});
  process.exitCode=1;
}finally{
  await browser.close();
  report.end=new Date().toISOString();
  await evidence(report);
}
