import { api, db as connect, evidence, login, runId, poll } from '../support/harness.mjs';
import { degradation, idempotency, load100, manualAndAmbiguous, security } from './scenarios.mjs';
import { recover } from '../../scripts/recover.mjs';
import { incident } from '../../scripts/incident.mjs';
import { cohortsWithPending, lostResponse } from './invariants.mjs';

const id=runId('aceptacion');
const report={title:'VetNotify · Aceptación del Escenario 1',runId:id,start:new Date().toISOString(),cases:[]};
const tests=[
  ['P1-1', (auth,db)=>load100(auth,db,id+'-lote')],
  ['P1-2', auth=>degradation(auth,id+'-degradacion')],
  ['P1-3', (auth,db)=>idempotency(auth,db,id+'-idem')],
  ['P1-4', (auth,db)=>recover(auth,db,id+'-reinicio')],
  ['P1-5', auth=>incident(auth,id+'-incidente')],
  ['Seguridad y acceso cruzado',(auth,db)=>security(auth,db,id+'-seguridad')],
  ['Reproceso y resultado ambiguo',(auth,db)=>manualAndAmbiguous(auth,db,id+'-manual')],
  ['Commit sin respuesta y cohorte madura',async (_auth,db)=>({
    summary:'Replay recuperó el ID confirmado; un pendiente y un fallo originales siguen en la cohorte.',
    transport:await lostResponse(db,id+'-transport'),cohort:await cohortsWithPending(db),
  })],
];
const selected=process.argv.slice(2);
const pool=connect();
try {
  report.version=await poll('versión API',()=>api('/version'),x=>Boolean(x.commit));
  const auth=await login();
  for(const [name,test] of tests){
    if(selected.length && !selected.includes(name)){
      report.cases.push({name,state:'no ejecutado',summary:'Fuera de la selección de esta corrida.'});
      continue;
    }
    console.log('Ejecutando',name);
    const started=new Date().toISOString();
    try {
      const result=await test(auth,pool);
      report.cases.push({name,state:'pasó',start:started,end:new Date().toISOString(),...result});
      console.log(name,'pasó');
    } catch(error) {
      process.exitCode=1;
      report.cases.push({name,state:'falló',start:started,end:new Date().toISOString(),summary:error.message});
      console.error(name,error.message);
    }
  }
} catch(error) {
  process.exitCode=1;
  report.cases.push({name:'Prerrequisitos',state:'falló',summary:error.message});
} finally {
  await pool.end();
  report.end=new Date().toISOString();
  await evidence(report);
}
