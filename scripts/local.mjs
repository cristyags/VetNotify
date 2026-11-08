import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const docker = process.platform === 'win32' ? 'docker.exe' : 'docker';
export function compose(args, capture = false) {
  const result = spawnSync(docker, ['compose', ...args], {
    stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', timeout: 240_000,
  });
  if (result.status !== 0) throw new Error('Docker Compose falló: '+args[0]+(capture ? ' · '+result.stderr?.trim() : ''));
  return result.stdout?.trim();
}
function gitCommit() {
  return spawnSync('git',['rev-parse','--short=12','HEAD'], { encoding:'utf8' }).stdout?.trim() || 'local';
}

if (process.argv[1]?.replaceAll('\\','/').endsWith('/scripts/local.mjs')) {
  const action = process.argv[2];
  if (action === 'doctor') {
    for (const [cmd,args] of [[docker,['info','--format','{{.OSType}}/{{.Architecture}}']],
      [docker,['compose','version']],['node',['--version']],['git',['--version']],['gh',['--version']],
      ['terraform',['version']],['kubectl',['version','--client']]]) {
      const r = spawnSync(cmd,args,{encoding:'utf8'});
      console.log(cmd, r.status === 0 ? r.stdout.trim().split('\n')[0] : 'no disponible');
      if (cmd === docker && r.status !== 0) process.exitCode=1;
    }
    console.log('Credenciales locales:',existsSync('.env') ? 'configuradas' : 'pendientes');
  } else {
    if (!existsSync('.env') && !process.env.POSTGRES_PASSWORD) throw new Error('Ejecuta npm run bootstrap-local');
    if (action === 'seed') compose(['run','--rm','seed']);
    else if (['core','full','obs'].includes(action)) {
      process.env.REVISION ||= gitCommit();
      if (action !== 'obs') {
        compose(['build','api']);
        compose(['up','-d','--wait','postgres']);
        compose(['run','--rm','migrate']);
        compose(['run','--rm','seed']);
        compose(['up','-d','--wait','api','worker-email','worker-internal','simulator','agenda','laboratorio','gateway']);
      }
      if (action !== 'core') compose(['--profile','observability','up','-d','collector','jaeger','prometheus','grafana','probe','node-exporter']);
      if (action === 'full') compose(['--profile','web','up','-d','--build','web']);
    } else throw new Error('Operación local desconocida');
  }
}
