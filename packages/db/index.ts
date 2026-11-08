import pg, { type PoolClient } from 'pg';

export function database(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL es obligatorio');
  const pool = new pg.Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 2000,
    statement_timeout: 4500, idle_in_transaction_session_timeout: 6000 });
  pool.on('error', () => process.stderr.write('{"level":"error","operation":"postgres_idle_connection"}\n'));
  return pool;
}

export async function transaction<T>(pool: pg.Pool, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function ready(pool: pg.Pool) {
  await pool.query('SELECT 1 FROM notifications LIMIT 1');
}
