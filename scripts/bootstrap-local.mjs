import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const envPath = process.argv[2] ?? '.env';
const names = ['POSTGRES_PASSWORD', 'AGENDA_KEY', 'LAB_KEY', 'DISABLED_KEY', 'OPERATOR_PASSWORD',
  'SOFIA_PASSWORD', 'DIEGO_PASSWORD', 'SIMULATOR_KEY', 'ADAPTER_KEY', 'GRAFANA_PASSWORD'];
if (!existsSync(envPath)) {
  const values = Object.fromEntries(names.map(name => [name, randomBytes(32).toString('base64url')]));
  const contents = Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n');
  writeFileSync(envPath, contents + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`Credenciales generadas en ${envPath}; el archivo queda fuera de Git.`);
} else {
  console.log('Se mantienen las credenciales existentes.');
}
