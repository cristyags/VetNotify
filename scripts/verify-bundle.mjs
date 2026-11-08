import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir=process.argv[2]??'dist';
const assets=(await readdir(join(dir,'assets'))).filter(name=>/\.(js|css|map)$/.test(name));
assert.ok(assets.some(name=>name.endsWith('.js')));
const paths=['index.html',...assets.map(name=>'assets/'+name)];
const names=['AGENDA_KEY','LAB_KEY','SIMULATOR_KEY','ADAPTER_KEY','POSTGRES_PASSWORD',
  'OPERATOR_PASSWORD','SOFIA_PASSWORD','DIEGO_PASSWORD','DISABLED_KEY','GRAFANA_PASSWORD'];
for(const path of paths){
  const source=await readFile(join(dir,path),'utf8');
  for(const name of names){
    const value=process.env[name];
    assert.ok(!source.includes(name)&&(!value||!source.includes(value)),
      'Referencia sensible detectada en '+path+' · '+name);
  }
}
console.log('Bundle verificado: '+paths.length+' archivos, sin claves ni contraseñas configuradas.');
