import { createServer } from 'node:net';
import { spawnSync } from 'node:child_process';
import { compose } from './local.mjs';

async function freePort() {
  const server=createServer();
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return String(port);
}
const port=await freePort();
let pgPort=await freePort();
while(port===pgPort) pgPort=await freePort();
Object.assign(process.env,{ COMPOSE_PROJECT_NAME:'vetnotify-ttl-'+Date.now().toString(36),VET_ENV:'test',
  IDEMPOTENCY_TTL_SECONDS:'2',VET_PORT:port,PG_PORT:pgPort,API_URL:'http://localhost:'+port });
delete process.env.DATABASE_URL;
try{
  compose(['up','-d','--wait','postgres']);
  compose(['run','--rm','migrate']);
  compose(['run','--rm','seed']);
  compose(['up','-d','--wait','api','gateway']);
  const child=spawnSync(process.execPath,['tests/integration/ttl-case.mjs'],{stdio:'inherit',timeout:60000});
  process.exitCode=child.status??1;
}finally{
  // The generated project name refers solely to this disposable isolated fixture.
  compose(['down','--volumes']);
}
