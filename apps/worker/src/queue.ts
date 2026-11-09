import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Channel, State } from '../../../packages/contracts/core.js';
import { leaseMs, retryMs } from '../../../packages/contracts/policy.js';
import { transaction } from '../../../packages/db/index.js';
import { transition, type Notification } from '../../../packages/db/notifications.js';

export type Job = Notification & { attempt_count: number; max_attempts: number; lease_token: string; attempt_id: string };
export type Result = {
  outcome: 'delivered' | 'transient' | 'permanent' | 'uncertain';
  code: string;
  receiptId?: string;
};
export type Recovered = { id: string; attempt_id: string; application_id: string; correlation_id: string; traceparent: string | null;
  tracestate: string | null; next: State; number: number };

export function nextState(result: Result, count: number, max: number): State {
  if (result.outcome === 'delivered') return 'delivered';
  if (result.outcome === 'permanent' || count >= max) return 'failed';
  return 'pending';
}

export async function take(pool: Pool, channel: Channel, worker: string): Promise<{ job?: Job; recovered?: Recovered }> {
  return transaction(pool, async client => {
    const { rows: [n] } = await client.query<Job>(`SELECT n.*, j.attempt_count,j.max_attempts,j.lease_token
      FROM jobs j JOIN notifications n ON n.id=j.notification_id
      WHERE j.channel=$1 AND ((j.state='pending' AND j.next_attempt_at<=clock_timestamp())
        OR (j.state='processing' AND j.lease_expires_at<=clock_timestamp()))
      ORDER BY CASE WHEN j.state='processing' THEN 0 ELSE 1 END,
        COALESCE(j.lease_expires_at,j.next_attempt_at),j.notification_id
      LIMIT 1 FOR UPDATE OF j SKIP LOCKED`, [channel]);
    if (!n) return {};
    if (n.state === 'processing') {
      const next = nextState({ outcome: 'uncertain', code: 'lease_expired' }, n.attempt_count, n.max_attempts);
      const { rows: [expired] } = await client.query<{ id: string }>(`UPDATE attempts SET outcome='uncertain',code='lease_expired',
        finished_at=clock_timestamp() WHERE notification_id=$1 AND number=$2 AND outcome='processing' RETURNING id`,
        [n.id, n.attempt_count]);
      await client.query(`UPDATE jobs SET state=$2,lease_token=NULL,lease_expires_at=NULL,
        next_attempt_at=clock_timestamp()+($3::int * interval '1 millisecond') WHERE notification_id=$1`,
        [n.id, next, next === 'pending' ? retryMs[n.attempt_count - 1] : 0]);
      await transition(client, n, 'processing', next, next === 'pending' ? 'lease_recovered' : 'lease_exhausted', worker);
      return { recovered: { id: n.id, attempt_id: expired.id, application_id: n.application_id, correlation_id: n.correlation_id,
        traceparent: n.traceparent, tracestate: n.tracestate, next, number: n.attempt_count } };
    }
    const token = randomUUID();
    const attemptId = randomUUID();
    const count = n.attempt_count + 1;
    await client.query(`UPDATE jobs SET state='processing',attempt_count=$2,lease_token=$3,
      lease_expires_at=clock_timestamp()+($4::int * interval '1 millisecond') WHERE notification_id=$1`,
      [n.id, count, token, leaseMs]);
    await client.query(`INSERT INTO attempts(id,notification_id,number,worker_id,outcome)
      VALUES($1,$2,$3,$4,'processing')`, [attemptId, n.id, count, worker]);
    await transition(client, n, 'pending', 'processing', 'attempt_claimed', worker);
    return { job: { ...n, state: 'processing', attempt_count: count, lease_token: token, attempt_id: attemptId } };
  });
}

export async function finish(pool: Pool, job: Job, worker: string, result: Result,
  traceFields: { trace_id?: string; span_id?: string }) {
  const next = nextState(result, job.attempt_count, job.max_attempts);
  return transaction(pool, async client => {
    const updated = await client.query(`UPDATE jobs SET state=$3,lease_token=NULL,lease_expires_at=NULL,
      next_attempt_at=clock_timestamp()+($4::int * interval '1 millisecond')
      WHERE notification_id=$1 AND lease_token=$2 AND state='processing' AND lease_expires_at>clock_timestamp()`,
      [job.id, job.lease_token, next, next === 'pending' ? retryMs[job.attempt_count - 1] : 0]);
    if (!updated.rowCount) return null;
    if (job.channel === 'internal' && next === 'delivered') {
      await client.query('INSERT INTO inbox(notification_id,recipient_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [job.id, job.recipient_id]);
    }
    await client.query(`UPDATE attempts SET finished_at=clock_timestamp(),outcome=$2,code=$3,receipt_id=$4,trace_id=$5,span_id=$6
      WHERE id=$1 AND outcome='processing'`,
      [job.attempt_id, result.outcome, result.code, result.receiptId ?? null, traceFields.trace_id ?? null, traceFields.span_id ?? null]);
    await transition(client, job, 'processing', next,
      next === 'pending' ? 'retry_scheduled' : result.code, worker);
    return next;
  });
}
