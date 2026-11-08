import { spawnSync } from 'node:child_process';

const quote = value => "'"+value.replaceAll("'","'\\''")+"'";
function sshArgs(command) {
  const { VET_SSH_TARGET: target, VET_SSH_KEY: key, VET_SSH_KNOWN_HOSTS: hosts } = process.env;
  if(!target || !/^vetops@vetnotify-[a-z0-9]+\.[a-z0-9.-]+$/.test(target) || !key || !hosts) {
    throw new Error('El acceso remoto requiere VM VetNotify, clave privada local y known_hosts verificado.');
  }
  return ['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+hosts,
    '-o','ConnectionAttempts=3','-o','ConnectTimeout=5','-i',key,target,command];
}

export function stopRemoteContainer(id) {
  if(!/^[0-9a-f]{64}$/.test(id)) throw new Error('ID de contenedor inválido');
  const result=spawnSync('ssh',sshArgs('sudo k3s crictl stop --timeout 0 '+id),{
    encoding:'utf8',stdio:'pipe',timeout:20000,
  });
  if(result.status!==0) throw new Error('No se confirmó la terminación del contenedor worker');
  return result.stdout.trim();
}

export function kubectlClient(args, { input, capture=false, timeout=100000, sensitive=false, acceptedStatuses=[0] }={}) {
  const remote=process.env.VET_SSH_TARGET && args[0]!=='kustomize';
  const command=remote?'ssh':'kubectl';
  const flags=remote?sshArgs('sudo k3s kubectl '+args.map(quote).join(' ')):args;
  const result=spawnSync(command,flags,{encoding:'utf8',input,timeout,maxBuffer:3_000_000,
    stdio:[input===undefined?'ignore':'pipe',capture?'pipe':'inherit',capture||sensitive?'pipe':'inherit']});
  if(!acceptedStatuses.includes(result.status)) throw new Error('kubectl '+args[0]+' falló'+(sensitive?' (datos protegidos)':result.stderr?.trim() ? ': '+result.stderr.trim():''));
  return result.stdout?.trim();
}
