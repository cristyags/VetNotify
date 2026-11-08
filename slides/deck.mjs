import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const folder=fileURLToPath(new URL('.',import.meta.url));
const evidence=fileURLToPath(new URL('../docs/evidence/',import.meta.url));
const reports=[];
for(const file of (await readdir(evidence)).filter(n=>n.endsWith('.json'))){
  const result=JSON.parse((await readFile(join(evidence,file),'utf8')).replace(/^\uFEFF/,''));
  if(result.cases)reports.push({...result,file});
}
reports.sort((a,b)=>String(b.end).localeCompare(String(a.end)));
function findCase(name, environment) {
  const r=reports.find(r=>(!environment||r.version?.environment===environment) && r.cases.some(c=>c.name===name&&c.state==='pasó'));
  return r?{...r.cases.find(c=>c.name===name&&c.state==='pasó'),file:r.file}:null;
}
const cloud=findCase('P1-1','dev');
const local=findCase('P1-1','local');
const load=cloud??local;
const incident=findCase('P1-5',cloud?'dev':'local')??findCase('P1-5');
const headlessCloud=findCase('USR-01','dev');
const headlessLocal=findCase('USR-01','local');
const rollback=findCase('DEV-12','dev');
const firing=incident?.firing[0];
const percent=firing?new Intl.NumberFormat('es-MX',{style:'percent',maximumFractionDigits:1}).format(Number(firing.value)):'—';
const clock=x=>x?.slice(11,19)??'—';
const reportLink=record=>record?'docs/evidence/'+record.file:'docs/STATUS.md';
const exists=async path=>Boolean(await stat(join(folder,path)).catch(()=>null));
const screenshot=await exists('../docs/evidence/ui-azure/06-resumen.png')?
  '../docs/evidence/ui-azure/06-resumen.png':'../docs/evidence/ui-local/06-resumen.png';
const grafana='../docs/evidence/signals-local/grafana.png';

const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const h2=text=>'<h2>'+escape(text)+'</h2>';
const list=items=>'<ul>'+items.map(text=>'<li>'+escape(text)+'</li>').join('')+'</ul>';
const split=(a,b)=>'<div class="split"><div>'+a+'</div><div>'+b+'</div></div>';
const text=value=>'<p>'+escape(value)+'</p>';
const image=(path,alt,cls='')=>'<img class="'+cls+'" src="'+escape(path)+'" alt="'+escape(alt)+'">';
const table=(headers,rows)=>'<table><thead><tr>'+headers.map(x=>'<th>'+escape(x)+'</th>').join('')+'</tr></thead><tbody>'+
  rows.map(r=>'<tr>'+r.map(x=>'<td>'+escape(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
const evidenceLine=value=>'<div class="source">'+escape(value)+'</div>';
const deck=[
 {section:'PROYECTO DE CÁTEDRA',title:'VetNotify',cover:true,
  body:'<p>Notificaciones multicanal para operaciones veterinarias</p><p class="course">DevOps y Métricas de Software · Escenario 1</p>',
  notes:'Presentar el contexto ficticio y los dos modos de demostración. Consultar la matriz antes de asignar quién expone cada sección.'},
 {section:'01 · DOMINIO',title:'Dos aplicaciones, dos canales',
  body:split(h2('Agenda Veterinaria')+text('Confirma, reprograma o cancela citas.')+
    h2('Laboratorio Veterinario')+text('Informa que llegó una muestra o que hay un resultado ficticio.'),
    h2('Correo de prueba')+text('El simulador guarda un recibo verificable.')+
    h2('Bandeja interna')+text('El destinatario consulta sus avisos persistentes.'))+
    evidenceLine('Cada aplicación usa una credencial de máquina propia.'),
  notes:'Demostrar un evento con ambos canales. Cada canal produce su propio identificador. Las claves están en los emisores, fuera de React. Fuentes: docs/api.md y docs/demo-api.md.'},
 {section:'02 · ARQUITECTURA',title:'Componentes y límites de confianza',
  body:image('../docs/diagrams/arquitectura.svg','Arquitectura editable en Mermaid','diagram')+
    evidenceLine('Caddy y gateway separan la API de la web. El PVC conserva PostgreSQL tras recrear el Pod.'),
  notes:'Sigue el recorrido de consola y luego el de navegador. Enseña que la API no depende del servidor de archivos de React. Fuente editable: docs/diagrams/arquitectura.mmd.'},
 {section:'03 · CONTRATO',title:'Aceptación durable',
  body:table(['Paso','Registro'],[['Identidad','La clave de máquina identifica el origen.'],['Transacción','Inserta notificación, trabajo e historial accepted/pending.'],
    ['Respuesta','HTTP 202, Location e ID después del commit.'],['Efecto','Un worker registra el recibo de correo o la entrada de bandeja.']])+
    evidenceLine('Una falla de PostgreSQL produce 503 en la API directa.'),
  notes:'Abre un ID y muestra la transición inicial. Si el cliente perdió la respuesta, repite la clave. Fuente: docs/diagrams/aceptacion.mmd y '+reportLink(findCase('Commit sin respuesta y cohorte madura'))+'.'},
 {section:'04 · CONSISTENCIA',title:'Idempotencia y reintentos',
  body:split(h2('Recepción')+list(['Alcance por aplicación, canal y clave.','Un replay devuelve el ID original.','Payload distinto con la misma clave responde 409.','TTL de 24 h desde la primera aceptación.']),
    h2('Entrega')+list(['Máximo de tres intentos por ID.','Espera persistida de 2 s y luego 4 s.','HTTP 503 vuelve a la cola.','Rechazo permanente termina tras un intento.'])),
  notes:'Explica la PK y el advisory lock para una clave que aún no tiene fila. La entrega incierta usa deduplicación propia del simulador. Fuente: docs/data-and-states.md y '+reportLink(findCase('P1-3'))+'.'},
 {section:'05 · RECUPERACIÓN',title:'Leases y reproceso explícito',
  body:split(h2('Caída del worker')+text('El intento ya tiene número y token en PostgreSQL.')+
      text('Al vencer el lease, otro worker conserva el contador y recupera la operación.'),
    h2('Orden del operador')+text('Una derivada recibe su propio ID, trabajo y auditoría.')+
      text('La original conserva el fallo y el historial para el análisis.'))+
    evidenceLine('El token vencido pierde el derecho de aplicar resultados.'),
  notes:'Muestra el caso P1-4 y la pantalla de reproceso. Contrasta recuperación automática del lease con nueva notificación derivada. Evidencia: '+reportLink(findCase('P1-4'))+'.'},
 {section:'06 · INFRAESTRUCTURA',title:'Terraform y K3s en Azure',
  body:table(['Decisión','Configuración'],[['Cómputo','VM B2as v2, 2 vCPU y 8 GiB en México Central.'],
    ['Estado','Blob privado con OAuth, lease y versiones.'],
    ['Arranque','Cloud-init instala K3s y Caddy con versiones fijadas.'],
    ['Persistencia','PVC local-path para PostgreSQL, Prometheus, Grafana y Jaeger.']]),
  notes:'Explica qué vive en el estado y qué vive en Secrets. Lee el plan antes de aplicar. Fuentes: docs/evidence/azure-plan-vm.json, docs/infrastructure.md.'},
 {section:'07 · CI/CD',title:'Checks, revisión y digests',
  body:split(h2('Integración')+list(['verify prueba código, API y navegador.','iac valida Terraform y Kustomize.','main exige checks y revisión independiente.']),
    h2('Publicación y promoción')+list(['GHCR vincula la imagen con commit y workflow.','Validación comprueba el digest antes de promover.','Producción requiere un PR aprobado con los digests.']))+
    evidenceLine('Estado de la promoción y de GitHub en docs/STATUS.md.'),
  notes:'Abrir PR #1 y la ejecución real. Distinguir un check exitoso, una revisión humana y la promoción. El plan privado rechazó reviewers de ambiente. Fuentes: docs/ci-cd.md y https://github.com/cristyags/VetNotify/pull/1.'},
 {section:'08 · OPERACIÓN',title:'Ambientes, acceso y salud',
  body:table(['Control','Efecto'],[['Namespaces dev/prod','Configuración, base, PVC y secretos separados.'],
    ['TLS y NSG','Caddy sirve HTTPS. SSH tiene una IP autorizada.'],
    ['Readiness','Sin base disponible, Kubernetes retira el endpoint.'],
    ['Liveness','El kubelet reinicia un contenedor que falla la probe.']]),
  notes:'Comprueba permisos con kubectl auth can-i. Explica por qué un PVC del nodo sobrevive a un Pod y requiere respaldo para perder la VM. Fuente: docs/security.md y docs/operations.md.'},
 {section:'09 · MÉTRICAS',title:'Cohortes y presupuestos',
  body:table(['Indicador','Población y objetivo'],[['Entrega inicial en 30 s','Originales de ambos canales. Meta 95% en 15 min.'],
    ['Bandeja en 5 s','Originales internos. Meta 99% en 15 min.'],
    ['Aceptación durable','Peticiones válidas de la sonda con lectura persistente / total válido.']])+
    evidenceLine('Ventana de aceptación [t − W − D, t − D). Los pendientes vencidos cuentan en N.'),
  notes:'Calcula floor(N × (1 − SLO)) con N=100 y N=50. Explica por qué una derivada no rescata el SLI del original y la sonda puede observar una caída total. Fuente: docs/observability.md.'},
 {section:'10 · SEÑALES',title:'Dashboard de operación',
  body:split(list(['Resultados y tamaño de la cohorte.','P95 de entrega y espera.','Pendientes, latidos y capacidad.','Fallos y reintentos por canal.']),
    image(grafana,'Dashboard real provisionado en Grafana','evidence-image'))+
    evidenceLine('Prometheus recopila cada 5 s. Los IDs se buscan en logs y trazas.'),
  notes:'Abrir la fuente real Grafana. Seleccionar un canal y mostrar cómo la agregación evita etiquetas por notificación. Evidencia: docs/evidence/signals-local/grafana.png.'},
 {section:'11 · INCIDENTE',title:'Degradación controlada de correo',
  body:incident?table(['UTC','Observación'],[[clock(incident.incidentStart),'Se activó HTTP 503 sostenido para correo.'],
    [clock(firing?.activeAt),'La condición de alerta superó el umbral. Observación firing: '+percent+'.'],
    [clock(incident.restoredAt),'Se restauró el modo sano y un correo nuevo se entregó.'],
    [clock(incident.resolvedAt),'La alerta volvió a normal al salir los fallos de la ventana.']])+
    evidenceLine(incident.failed.length+' correos fallaron tras tres intentos. Un aviso interno se entregó durante el incidente.'):
    text('La evidencia de activación y recuperación se registra en el informe del incidente.'),
  notes:'Comparar las métricas de antes, durante y después. Seguir la traza de tres servicios. Distinguir activeAt de la observación firing. Evidencia: '+reportLink(incident)+'.'},
 {section:'12 · ROLLBACK',title:'Recuperación de una versión',
  body:split(h2('Diagnóstico')+text('Kubernetes reporta el error al intentar descargar una imagen de prueba inexistente.')+
    text('Se revisan eventos, condiciones y el digest de la versión previa.'),
    h2('Verificación')+text('Rollout undo devuelve el Deployment a su revisión anterior.')+
    text(rollback?'La prueba comprobó una entrega previa conservada y una nueva entrega exitosa.':'La comprobación en Azure se reporta en el archivo de estado.'))+
    evidenceLine('El rollback cambia el Deployment. PostgreSQL conserva el volumen.'),
  notes:'Enseñar el UID del Pod con error, digest original y resultado funcional. Evidencia: '+reportLink(rollback)+'.'},
 {section:'13 · COSTOS',title:'Operación bajo demanda',
  body:table(['Concepto','Tarifa o medida'],[['VM B2as v2','US$0.0827 por hora de cómputo.'],
    ['Disco E6','US$5.28 por mes, más operaciones.'],['IPv4 Standard','US$0.005 por hora.'],
    ['Control','US$20/mes de presupuesto de aviso. El equipo controla el acumulado de US$100.']])+
    evidenceLine('La desasignación corta el cómputo. La IP y el disco permanecen.'),
  notes:'Identificar cargos observados y separar el estimado del reporte de facturación. Explicar los umbrales 50, 75 y 90%. Fuente: docs/costs.md y la API oficial de precios Azure.'},
 {section:'14 · RESULTADOS',title:'Dos recorridos verificados',
  body:split(h2(load?load.persisted.notifications+' notificaciones consultables':'Lote de aceptación')+
    text(load?'95 entregadas y 5 fallidas esperadas en el lote controlado.':'Consulta el informe P1-1 para el resultado del lote.')+
    list([headlessCloud?'API comprobada con la web a cero en K3s.':headlessLocal?'API comprobada con la web detenida en Compose.':'La independencia se registra en el informe de pruebas.',
      'Chrome recorrió ambos emisores y la bandeja a 360 px.']),
    image(screenshot,'Resumen de VetNotify con datos reales de prueba','evidence-image'))+
    evidenceLine('Matriz, guiones, evidencia JSON y preparación individual en el repositorio.'),
  notes:'Arranca con la demo API y conserva la web apagada durante la comprobación. Cambia a la demo visual para mostrar exactamente los mismos contratos. Evidencia: '+reportLink(headlessCloud??headlessLocal)+'.'},
];

const css=`
@page{size:1280px 720px;margin:0}
*{box-sizing:border-box}
body{margin:0;background:#e4ecee;color:#16323a;font-family:"Segoe UI",Arial,sans-serif}
.slide{width:1280px;height:720px;padding:58px 72px 47px;margin:24px auto;display:flex;flex-direction:column;background:#fff;position:relative}
.slide::before{content:"";height:7px;width:100%;position:absolute;top:0;left:0;background:#0f766e}
.slide .kicker{color:#17675d;font-size:16px;font-weight:740;letter-spacing:.12em;margin:0 0 16px}
h1{font-size:49px;letter-spacing:-.048em;line-height:1.08;margin:0 0 30px}
h2{font-size:28px;letter-spacing:-.028em;margin:0 0 11px}
h2:not(:first-child){margin-top:28px}
p,li,td,th{font-size:23px;line-height:1.42}
p{margin:0 0 18px}
ul{margin:0;padding-left:24px}
li{padding-left:4px;margin-bottom:14px}
.split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.split>div{min-width:0}
table{width:100%;border-collapse:collapse;margin-top:6px}
th{text-align:left;background:#e8f5f1;color:#125e55;font-weight:700}
td,th{border-bottom:1px solid #dbe6e8;padding:12px 17px;vertical-align:top}
td:first-child{font-weight:670;min-width:240px}
.source{font-size:17px;color:#52636b;border-top:1px solid #dde5e8;padding-top:13px;margin-top:21px;line-height:1.35}
.diagram{display:block;width:100%;height:407px;object-fit:contain;object-position:left center}
.evidence-image{width:100%;max-height:370px;object-fit:contain;object-position:top left;border:1px solid #dde5e8}
.foot{position:absolute;bottom:24px;left:72px;right:72px;display:flex;justify-content:space-between;font-size:14px;color:#52636b}
.cover{background:#103e42;color:#fff;justify-content:center}
.cover::before{height:0}
.cover .kicker,.cover .foot{color:#b6e2d9}
.cover h1{font-size:116px;margin-bottom:18px;font-weight:670;letter-spacing:-.065em}
.cover p{font-size:35px;color:#e8f5f1}
.cover .course{font-size:19px;color:#b6e2d9;margin-top:27px}
@media print{body{background:#fff}.slide{margin:0;break-after:page;print-color-adjust:exact;-webkit-print-color-adjust:exact}.slide:last-child{break-after:auto}}
`;
const slides=deck.map((s,i)=>`<section class="slide${s.cover?' cover':''}" aria-label="Diapositiva ${i+1}">
<div class="kicker">${escape(s.section)}</div><h1>${escape(s.title)}</h1><div>${s.body}</div>
<div class="foot"><span>VetNotify</span><span>${String(i+1).padStart(2,'0')} / ${deck.length}</span></div></section>`).join('\n');
const html=`<!doctype html><html lang="es"><meta charset="UTF-8"><title>VetNotify · Defensa</title><style>${css}</style><body>${slides}</body></html>`;
const htmlPath=join(folder,'VetNotify.html');
await writeFile(htmlPath,html);
await writeFile(join(folder,'notas.md'),'# Notas de exposición\n\n'+deck.map((s,i)=>`## ${i+1}. ${s.title}\n\n${s.notes}\n`).join('\n'));
const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto(pathToFileURL(htmlPath).href,{waitUntil:'load'});
  await page.emulateMedia({media:'print'});
  await page.evaluate(()=>document.fonts.ready);
  const invalid=await page.evaluate(()=>[...document.querySelectorAll('.slide')].flatMap((s,i)=>{
    const bounds=s.getBoundingClientRect();
    const main=s.children[2].getBoundingClientRect();
    return main.bottom>bounds.bottom-47||[...s.querySelectorAll('img')].some(img=>!img.complete||!img.naturalWidth) ? [i+1] : [];
  }));
  if(invalid.length)throw new Error('Revisa el contenido de diapositivas '+invalid.join(', '));
  await page.pdf({path:join(folder,'VetNotify.pdf'),preferCSSPageSize:true,printBackground:true,tagged:true});
  console.log(deck.length+' diapositivas exportadas');
}finally{await browser.close();}
