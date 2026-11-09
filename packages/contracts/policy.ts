export function integerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Configuración inválida: ${name}`);
  return value;
}

export const environment = process.env.VET_ENV ?? 'local';
export const maxAttempts = integerEnv('MAX_ATTEMPTS', 3, 1, 3);
export const idempotencyTtl = integerEnv('IDEMPOTENCY_TTL_SECONDS', 86400,
  environment === 'test' ? 1 : 86400, 604800);
export const providerTimeoutMs = integerEnv('PROVIDER_TIMEOUT_MS', 2000, 200, 15000);
export const leaseMs = integerEnv('LEASE_MS', 9000, providerTimeoutMs + 2000, 120000);
export const retryMs = [
  integerEnv('FIRST_RETRY_MS', 2000, 100, 120000),
  integerEnv('SECOND_RETRY_MS', 4000, 100, 120000),
];

export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

export const faultsEnabled = process.env.DEMO_FAULTS === 'true' && environment !== 'prod';
