import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { database, transaction } from '../packages/db/index.js';

const pool = database();
const dir = new URL('../packages/db/migrations/', import.meta.url);
// Compiled JavaScript runs beside the SQL copied by build-api.
try {
  const versions = (await readdir(dir)).filter(name => /^\d{3}_[a-z_]+\.sql$/.test(name)).sort();
  if (!versions.length) throw new Error('No hay migraciones');
  await transaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(107584321)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz DEFAULT clock_timestamp()
    )`);
    for (const version of versions) {
      const sql = await readFile(new URL(version, dir), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = (await client.query('SELECT checksum FROM schema_migrations WHERE version=$1', [version])).rows[0];
      if (existing) {
        if (existing.checksum !== checksum) throw new Error(`Migración modificada: ${version}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)', [version, checksum]);
      console.log(`Aplicada ${version}`);
    }
  });
} finally {
  await pool.end();
}
