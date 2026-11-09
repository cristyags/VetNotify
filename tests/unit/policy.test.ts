import { describe, expect, test } from 'vitest';
import { fingerprint } from '../../packages/contracts/core.js';
import { idempotencyTtl } from '../../packages/contracts/policy.js';
import { nextState } from '../../apps/worker/src/queue.js';

describe('Invariantes de negocio', () => {
  test('orden de claves no altera la huella', () => {
    expect(fingerprint({ subject:'Cita', metadata:{ pet:'Luna', event:'confirmed' } }))
      .toBe(fingerprint({ metadata:{ event:'confirmed', pet:'Luna' }, subject:'Cita' }));
    expect(fingerprint({ subject:'Cita', pet:'Luna' })).not.toBe(fingerprint({ subject:'Cita', pet:'Max' }));
  });
  test('TTL normal de 24 horas', () => {
    expect(idempotencyTtl).toBe(86400);
  });
  test('la clasificación y el máximo determinan transición', () => {
    expect(nextState({ outcome:'uncertain',code:'timeout' },2,3)).toBe('pending');
    expect(nextState({ outcome:'transient',code:'503' },3,3)).toBe('failed');
    expect(nextState({ outcome:'permanent',code:'rejected' },1,3)).toBe('failed');
    expect(nextState({ outcome:'delivered',code:'receipt' },3,3)).toBe('delivered');
  });
});
