import { spawnSync } from 'node:child_process';

const quote = value => "'"+value.replaceAll("'","'\\''")+"'";
export function kubectlClient(args, { input, capture=false, timeout=100000, sensitive=false }={}) {
  const { VET_SSH_TARGET: target, VET_SSH_KEY: key, VET_SSH_KNOWN_HOSTS: hosts } = process.env;
  const remote=target && args[0]!=='kustomize';
  if(remote && (!/^vetops@vetnotify-[a-z0-9]+\.[a-z0-9.-]+$/.test(target) || !key || !hosts)) {
    throw new Error('El acceso remoto requiere VM VetNotify, clave privada local y known_hosts verificado.');
  }
  const command=remote?'ssh':'kubectl';
  const flags=remote?['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+hosts,
    '-i',key,target,'sudo k3s kubectl '+args.map(quote).join(' ')]:args;
  const result=spawnSync(command,flags,{encoding:'utf8',input,timeout,maxBuffer:3_000_000,
    stdio:[input===undefined?'ignore':'pipe',capture?'pipe':'inherit',capture||sensitive?'pipe':'inherit']});
  if(result.status!==0) throw new Error('kubectl '+args[0]+' falló'+(sensitive?' (datos protegidos)':result.stderr?.trim() ? ': '+result.stderr.trim():''));
  return result.stdout?.trim();
}
