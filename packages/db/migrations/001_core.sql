CREATE TABLE applications (
  id text PRIMARY KEY,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE application_credentials (
  key_hash text PRIMARY KEY CHECK (length(key_hash) = 64),
  application_id text NOT NULL REFERENCES applications(id),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE recipients (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  pet_name text NOT NULL,
  email text NOT NULL UNIQUE
);

CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'operator', 'recipient')),
  recipient_id text REFERENCES recipients(id),
  password_hash text NOT NULL,
  CHECK ((role = 'recipient') = (recipient_id IS NOT NULL))
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TYPE delivery_channel AS ENUM ('email', 'internal');
CREATE TYPE notification_state AS ENUM ('accepted', 'pending', 'processing', 'delivered', 'failed');

CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id),
  recipient_id text NOT NULL REFERENCES recipients(id),
  recipient_email text,
  channel delivery_channel NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  metadata jsonb NOT NULL,
  run_id text,
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  delivered_at timestamptz,
  state notification_state NOT NULL,
  correlation_id uuid NOT NULL,
  traceparent text,
  tracestate text,
  creation_kind text NOT NULL CHECK (creation_kind IN ('initial','manual_reprocess')),
  parent_notification_id uuid UNIQUE REFERENCES notifications(id),
  root_notification_id uuid NOT NULL REFERENCES notifications(id) DEFERRABLE INITIALLY DEFERRED,
  CHECK ((channel = 'email') = (recipient_email IS NOT NULL)),
  CHECK ((creation_kind = 'initial' AND parent_notification_id IS NULL AND root_notification_id = id)
    OR (creation_kind = 'manual_reprocess' AND parent_notification_id IS NOT NULL AND root_notification_id <> id))
);

CREATE INDEX notifications_date_idx ON notifications(accepted_at DESC, id DESC);
CREATE INDEX notifications_app_idx ON notifications(application_id, accepted_at DESC, id DESC);
CREATE INDEX notifications_state_idx ON notifications(state, channel, accepted_at);
CREATE INDEX notifications_recipient_idx ON notifications(recipient_id, accepted_at DESC);
CREATE INDEX notifications_channel_idx ON notifications(channel, accepted_at DESC);
CREATE INDEX notifications_run_idx ON notifications(run_id) WHERE run_id IS NOT NULL;
CREATE INDEX notifications_root_idx ON notifications(root_notification_id, accepted_at);

CREATE TABLE idempotency (
  application_id text NOT NULL REFERENCES applications(id),
  channel delivery_channel NOT NULL,
  key text NOT NULL,
  fingerprint text NOT NULL,
  notification_id uuid NOT NULL REFERENCES notifications(id),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (application_id, channel, key)
);

CREATE TABLE jobs (
  notification_id uuid PRIMARY KEY REFERENCES notifications(id),
  channel delivery_channel NOT NULL,
  state notification_state NOT NULL CHECK (state <> 'accepted'),
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL CHECK (max_attempts BETWEEN 1 AND 3),
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_token uuid,
  lease_expires_at timestamptz,
  CHECK (attempt_count BETWEEN 0 AND max_attempts),
  CHECK ((state = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (state <> 'processing' AND lease_token IS NULL AND lease_expires_at IS NULL))
);
CREATE INDEX jobs_pending_idx ON jobs(channel, next_attempt_at, notification_id) WHERE state = 'pending';
CREATE INDEX jobs_processing_idx ON jobs(channel, lease_expires_at) WHERE state = 'processing';

CREATE TABLE attempts (
  id uuid PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES notifications(id),
  number int NOT NULL CHECK (number BETWEEN 1 AND 3),
  worker_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  outcome text NOT NULL CHECK (outcome IN ('processing','delivered','transient','permanent','uncertain')),
  code text,
  receipt_id uuid,
  trace_id text,
  span_id text,
  UNIQUE (notification_id, number)
);

CREATE TABLE transitions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES notifications(id),
  from_state notification_state,
  to_state notification_state NOT NULL,
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL,
  actor text NOT NULL,
  correlation_id uuid NOT NULL
);
CREATE INDEX transitions_lookup_idx ON transitions(notification_id, id);

CREATE TABLE inbox (
  notification_id uuid PRIMARY KEY REFERENCES notifications(id),
  recipient_id text NOT NULL REFERENCES recipients(id),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  read_at timestamptz
);
CREATE INDEX inbox_recipient_idx ON inbox(recipient_id, available_at DESC, notification_id DESC);

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  details jsonb NOT NULL
);

CREATE TABLE reprocess_commands (
  operator_id text NOT NULL REFERENCES users(id),
  source_id uuid NOT NULL UNIQUE REFERENCES notifications(id),
  key text NOT NULL,
  fingerprint text NOT NULL,
  derived_id uuid NOT NULL UNIQUE REFERENCES notifications(id),
  PRIMARY KEY (operator_id, source_id, key)
);

CREATE TABLE fault_profiles (
  run_id text PRIMARY KEY,
  mode text NOT NULL CHECK (mode IN ('fail_first_n','always_503','timeout','permanent_rejection','accepted_then_timeout')),
  first_n int NOT NULL DEFAULT 0 CHECK (first_n BETWEEN 0 AND 3),
  address_prefix text,
  expires_at timestamptz NOT NULL
);

CREATE TABLE simulator_deliveries (
  delivery_key text PRIMARY KEY,
  notification_id uuid NOT NULL UNIQUE REFERENCES notifications(id),
  calls int NOT NULL DEFAULT 0,
  receipt_id uuid UNIQUE,
  accepted_at timestamptz
);

CREATE TABLE simulator_calls (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  delivery_key text NOT NULL REFERENCES simulator_deliveries(delivery_key),
  call_no int NOT NULL,
  mode text NOT NULL,
  result text NOT NULL,
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (delivery_key, call_no)
);

CREATE TABLE worker_heartbeats (
  channel delivery_channel NOT NULL,
  worker_id text NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (channel, worker_id)
);
