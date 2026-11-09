import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { hash, HttpError } from '../../../packages/contracts/core.js';
import { passwordMatches, randomToken, secureEqual } from '../../../packages/db/password.js';

const sessionCookie = 'vetnotify_session';
const sessionLifetime = 8 * 60 * 60;
export interface Human {
  id: string;
  name: string;
  role: 'admin' | 'operator' | 'recipient';
  recipient_id: string | null;
  csrf_token: string;
}

export function security(pool: Pool, publicOrigin: string) {
  const cookie = { path: '/', secure: publicOrigin.startsWith('https:'), httpOnly: true, sameSite: 'strict' as const };
  function origin(req: FastifyRequest) {
    if (req.headers.origin && req.headers.origin !== publicOrigin) {
      throw new HttpError(403, 'invalid_origin', 'El origen de la solicitud no está permitido.');
    }
  }
  async function login(req: FastifyRequest, reply: FastifyReply, username: string, password: string) {
    origin(req);
    const { rows: [user] } = await pool.query<Human & { password_hash: string }>(
      'SELECT id,name,role,recipient_id,password_hash FROM users WHERE id=$1', [username]);
    if (!await passwordMatches(password, user?.password_hash)) {
      throw new HttpError(401, 'invalid_login', 'Usuario o contraseña incorrectos.');
    }
    const token = randomToken();
    const csrf = randomToken();
    if (req.cookies[sessionCookie]) {
      await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hash(req.cookies[sessionCookie])]);
    }
    await pool.query('DELETE FROM sessions WHERE expires_at <= clock_timestamp()');
    await pool.query(`INSERT INTO sessions VALUES($1,$2,$3,clock_timestamp()+make_interval(secs=>$4))`,
      [hash(token), user.id, csrf, sessionLifetime]);
    reply.setCookie(sessionCookie, token, { ...cookie, maxAge: sessionLifetime });
    return identity({ ...user, csrf_token: csrf });
  }
  async function human(req: FastifyRequest, access: 'any' | 'operator' | 'admin' | 'recipient' = 'any', write = false) {
    const token = req.cookies[sessionCookie];
    if (!token) throw unauthorized();
    const { rows: [user] } = await pool.query<Human>(`SELECT u.id,u.name,u.role,u.recipient_id,s.csrf_token
      FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp()`, [hash(token)]);
    if (!user) throw unauthorized();
    if (access !== 'any' && user.role !== access && !(access === 'operator' && user.role === 'admin')) {
      throw new HttpError(403, 'forbidden', 'Tu cuenta no tiene permiso para esta operación.');
    }
    if (write) {
      origin(req);
      const csrf = req.headers['x-csrf-token'];
      if (!secureEqual(typeof csrf === 'string' ? csrf : undefined, user.csrf_token)) {
        throw new HttpError(403, 'csrf', 'La validación de la sesión falló. Actualiza e inténtalo de nuevo.');
      }
    }
    return user;
  }
  async function logout(req: FastifyRequest, reply: FastifyReply) {
    await human(req, 'any', true);
    await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hash(req.cookies[sessionCookie]!)]);
    reply.clearCookie(sessionCookie, cookie).code(204).send();
  }
  async function machine(req: FastifyRequest) {
    const key = /^Bearer ([A-Za-z0-9_-]{43,128})$/i.exec(req.headers.authorization ?? '')?.[1];
    if (!key) throw unauthorized();
    const { rows: [app] } = await pool.query<{ id: string }>(`SELECT a.id FROM application_credentials c
      JOIN applications a ON a.id=c.application_id WHERE c.key_hash=$1 AND c.enabled AND a.enabled`, [hash(key)]);
    if (!app) throw unauthorized();
    return app.id;
  }
  async function reader(req: FastifyRequest) {
    if (req.headers.authorization) return machine(req);
    await human(req, 'operator');
    return undefined;
  }
  return { login, logout, human, machine, reader };
}

function unauthorized() {
  return new HttpError(401, 'unauthorized', 'Se requiere una credencial válida.');
}

export function identity(user: Human) {
  return { id: user.id, name: user.name, role: user.role, recipientId: user.recipient_id, csrfToken: user.csrf_token };
}
