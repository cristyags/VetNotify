import { database, transaction } from '../packages/db/index.js';
import { hash } from '../packages/contracts/core.js';
import { required } from '../packages/contracts/policy.js';
import { passwordHash } from '../packages/db/password.js';

const apps = [
  ['agenda-veterinaria', 'Agenda Veterinaria', 'AGENDA_KEY', true],
  ['laboratorio-veterinario', 'Laboratorio Veterinario', 'LAB_KEY', true],
  ['emisor-inactivo', 'Emisor de control inactivo', 'DISABLED_KEY', false],
] as const;
const users = [
  ['operador', 'Operaciones VetNotify', 'admin', null, 'OPERATOR_PASSWORD'],
  ['sofia', 'Sofía Rivera', 'recipient', 'luna', 'SOFIA_PASSWORD'],
  ['diego', 'Diego Salas', 'recipient', 'max', 'DIEGO_PASSWORD'],
] as const;

const pool = database();
try {
  await transaction(pool, async client => {
    await client.query(`INSERT INTO recipients VALUES
      ('luna','Sofía Rivera','Luna','sofia@example.test'),
      ('max','Diego Salas','Max','diego@example.test') ON CONFLICT (id) DO NOTHING`);
    for (const [id, name, variable, enabled] of apps) {
      await client.query('INSERT INTO applications VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING', [id, name, enabled]);
      const secret = required(variable);
      if (!/^[\w-]{43,128}$/.test(secret)) throw new Error(`Clave de máquina de longitud o formato no válido: ${variable}`);
      const digest = hash(secret);
      const existing = (await client.query('SELECT application_id FROM application_credentials WHERE key_hash=$1', [digest])).rows[0];
      if (existing && existing.application_id !== id) throw new Error('Los emisores deben usar claves independientes');
      await client.query('INSERT INTO application_credentials(key_hash,application_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [digest, id]);
    }
    for (const [id, name, role, recipient, variable] of users) {
      const password = required(variable);
      if (password.length < 20) throw new Error(`La contraseña de demo debe ser aleatoria y larga: ${variable}`);
      await client.query(`INSERT INTO users VALUES($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [id, name, role, recipient, await passwordHash(password)]);
    }
  });
  console.log('Identidades de demostración registradas');
} finally {
  await pool.end();
}
