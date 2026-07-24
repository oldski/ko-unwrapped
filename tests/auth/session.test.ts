import { describe, it, expect, beforeAll } from 'vitest';
import { sealSession, unsealSession, type CurationSession } from '@/lib/auth/session';

const SESSION: CurationSession = {
  spotifyUserId: 'oldski',
  displayName: 'kris',
  refreshToken: 'AQ-example-refresh-token',
};

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-not-for-production';
});

describe('session sealing', () => {
  it('round-trips a session', () => {
    const token = sealSession(SESSION);
    expect(unsealSession(token)).toEqual(SESSION);
  });

  it('produces different ciphertexts per call (random IV)', () => {
    expect(sealSession(SESSION)).not.toBe(sealSession(SESSION));
  });

  it('returns null for a tampered token', () => {
    const token = sealSession(SESSION);
    const tampered = token.slice(0, -4) + (token.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(unsealSession(tampered)).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(unsealSession('not-a-token')).toBeNull();
    expect(unsealSession('')).toBeNull();
  });
});
