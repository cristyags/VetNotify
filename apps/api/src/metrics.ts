import type { Pool } from 'pg';
import { cohorts } from '../../../packages/db/notifications.js';
import { environment } from '../../../packages/contracts/policy.js';

export async function metrics(pool: Pool) {
  const [results, attempts, queue, workers, distributions, slis, recent, retries] = await Promise.all([
    pool.query(`SELECT application_id,channel,state,creation_kind,count(*)::int AS value
      FROM notifications GROUP BY application_id,channel,state,creation_kind`),
    pool.query(`SELECT j.channel,a.outcome,count(*)::int AS value FROM attempts a
      JOIN jobs j USING(notification_id) GROUP BY j.channel,a.outcome`),
    pool.query(`SELECT c.channel, count(j.notification_id) FILTER(WHERE j.state='pending')::int AS pending,
      count(j.notification_id) FILTER(WHERE j.state='processing')::int AS processing,
      COALESCE(max(extract(epoch FROM clock_timestamp()-n.accepted_at)) FILTER(WHERE j.state='pending'),0)::float8 AS oldest
      FROM unnest(enum_range(NULL::delivery_channel)) AS c(channel)
      LEFT JOIN jobs j ON j.channel=c.channel AND j.state IN ('pending','processing')
      LEFT JOIN notifications n ON n.id=j.notification_id GROUP BY c.channel`),
    pool.query(`SELECT c.channel,COALESCE(extract(epoch FROM max(h.updated_at)),0)::float8 AS value
      FROM unnest(enum_range(NULL::delivery_channel)) AS c(channel)
      LEFT JOIN worker_heartbeats h ON h.channel=c.channel GROUP BY c.channel`),
    pool.query(`WITH durations AS (
        SELECT 'delivery' AS stage,channel,extract(epoch FROM delivered_at-accepted_at) AS seconds FROM notifications WHERE state='delivered'
        UNION ALL
        SELECT 'queue' AS stage,n.channel,extract(epoch FROM a.started_at-n.accepted_at) AS seconds
          FROM notifications n JOIN attempts a ON a.notification_id=n.id AND a.number=1
      ) SELECT stage,channel,count(*)::int AS count,sum(seconds)::float8 AS sum,
        ARRAY[0.05,0.1,0.25,0.5,1,2,5,10,15,30,60] AS bounds,
        count(*) FILTER(WHERE seconds<=0.05)::int AS b0,
        count(*) FILTER(WHERE seconds<=0.1)::int AS b1,
        count(*) FILTER(WHERE seconds<=0.25)::int AS b2,
        count(*) FILTER(WHERE seconds<=0.5)::int AS b3,
        count(*) FILTER(WHERE seconds<=1)::int AS b4,
        count(*) FILTER(WHERE seconds<=2)::int AS b5,
        count(*) FILTER(WHERE seconds<=5)::int AS b6,
        count(*) FILTER(WHERE seconds<=10)::int AS b7,
        count(*) FILTER(WHERE seconds<=15)::int AS b8,
        count(*) FILTER(WHERE seconds<=30)::int AS b9,
        count(*) FILTER(WHERE seconds<=60)::int AS b10
      FROM durations d GROUP BY stage,channel`),
    cohorts(pool),
    pool.query(`SELECT c.channel, count(n.id) FILTER(WHERE n.state='failed')::int AS failed,count(n.id)::int AS total
      FROM unnest(enum_range(NULL::delivery_channel)) AS c(channel) LEFT JOIN notifications n
       ON n.channel=c.channel AND n.state IN ('failed','delivered') AND n.creation_kind='initial'
       AND n.updated_at>=statement_timestamp()-interval '2 minutes' GROUP BY c.channel`),
    pool.query(`SELECT j.channel,count(*)::int AS value FROM transitions t
      JOIN jobs j USING(notification_id) WHERE t.reason IN ('retry_scheduled','lease_recovered') GROUP BY j.channel`),
  ]);
  const lines: string[] = [];
  const metric = (name: string, type: string, help: string) => lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`);
  const value = (name: string, amount: number, labels: Record<string, string> = {}) => {
    const parts = Object.entries({ environment, ...labels }).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
    lines.push(`${name}{${parts.join(',')}} ${amount}`);
  };
  metric('vetnotify_notifications', 'gauge', 'Durable records by current state and creation kind.');
  metric('vetnotify_accepted_total', 'counter', 'Durable notification creations.');
  const accepted = new Map<string, number>();
  for (const row of results.rows) value('vetnotify_notifications', row.value, {
    app_slug: row.application_id, channel: row.channel, state: row.state, creation_kind: row.creation_kind,
  });
  for (const row of results.rows) {
    const key = [row.application_id,row.channel,row.creation_kind].join('/');
    accepted.set(key, (accepted.get(key) ?? 0) + row.value);
  }
  for (const [key, count] of accepted) {
    const [app_slug,channel,creation_kind] = key.split('/');
    value('vetnotify_accepted_total', count, { app_slug,channel,creation_kind });
  }
  metric('vetnotify_attempts', 'gauge', 'Durable attempts by current outcome.');
  for (const row of attempts.rows) value('vetnotify_attempts', row.value, { channel: row.channel, outcome: row.outcome });
  metric('vetnotify_retries_total', 'counter', 'Persisted retry schedule events.');
  for (const row of retries.rows) value('vetnotify_retries_total', row.value, { channel: row.channel });
  metric('vetnotify_queue_jobs', 'gauge', 'Jobs pending or processing.');
  for (const row of queue.rows) {
    for (const state of ['pending','processing']) value('vetnotify_queue_jobs', row[state], { channel: row.channel, state });
  }
  metric('vetnotify_oldest_pending_seconds', 'gauge', 'Age of oldest pending job or zero.');
  for (const row of queue.rows) value('vetnotify_oldest_pending_seconds', row.oldest, { channel: row.channel });
  metric('vetnotify_worker_heartbeat_timestamp_seconds', 'gauge', 'Latest persisted heartbeat by channel.');
  for (const row of workers.rows) value('vetnotify_worker_heartbeat_timestamp_seconds', row.value, { channel: row.channel });
  metric('vetnotify_duration_seconds', 'histogram', 'Time to first processing or durable delivery, in seconds.');
  for (const row of distributions.rows) {
    const labels = { stage: row.stage, channel: row.channel };
    for (const [i, bound] of row.bounds.entries()) {
      value('vetnotify_duration_seconds_bucket', row['b'+i], { ...labels, le: String(bound) });
    }
    value('vetnotify_duration_seconds_bucket', row.count, { ...labels, le: '+Inf' });
    value('vetnotify_duration_seconds_sum', row.sum, labels);
    value('vetnotify_duration_seconds_count', row.count, labels);
  }
  for (const [name, field] of [['population','population'],['good','good'],['budget','error_budget'],['target','target']]) {
    metric('vetnotify_sli_'+name, 'gauge', 'Snapshot for mature 15 minute initial delivery cohorts.');
    for (const row of slis) value('vetnotify_sli_'+name, row[field], {
      sli: row.sli, channel: row.group_channel ?? 'all', app_slug: row.application_id ?? 'all',
    });
  }
  metric('vetnotify_final_2m', 'gauge', 'Terminal initial notifications within the last two minutes.');
  for (const row of recent.rows) {
    value('vetnotify_final_2m', row.failed, { channel: row.channel, outcome: 'failed' });
    value('vetnotify_final_2m', row.total, { channel: row.channel, outcome: 'all' });
  }
  const memory = process.memoryUsage();
  metric('vetnotify_api_resident_memory_bytes', 'gauge', 'Resident memory of the API process.');
  value('vetnotify_api_resident_memory_bytes', memory.rss);
  return lines.join('\n')+'\n';
}
