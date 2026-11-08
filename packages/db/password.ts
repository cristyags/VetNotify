import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export const randomToken = () => randomBytes(32).toString('base64url');

export async function passwordHash(password: string, salt = randomBytes(16).toString('hex')) {
  const key = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function passwordMatches(password: string, encoded: string | undefined) {
  const [, salt, digest] = (encoded ?? `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  const candidate = await derive(password, salt, 64) as Buffer;
  return Boolean(encoded) && timingSafeEqual(candidate, Buffer.from(digest, 'hex'));
}

export function secureEqual(left: string | undefined, right: string) {
  if (!left) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
