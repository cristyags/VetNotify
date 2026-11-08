import { readdir, readFile } from 'node:fs/promises';

const dir=process.env.EVIDENCE_DIR ?? 'docs/evidence';
for (const file of (await readdir(dir)).filter(name=>name.endsWith('.json')).sort()) {
  const data=JSON.parse((await readFile(dir+'/'+file,'utf8')).replace(/^\uFEFF/,''));
  if(!Array.isArray(data.cases)) continue;
  console.log(file+' · '+(data.version?.environment??'entorno no identificado'));
  for(const item of data.cases) console.log('  '+item.name+' · '+item.state);
}
