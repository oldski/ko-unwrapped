import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// AES-256-GCM sealed session stored in an httpOnly cookie. No DB.
// Key derived from SESSION_SECRET; GCM auth tag makes tampering detectable.

export const SESSION_COOKIE = 'curation_session';

export interface CurationSession {
  spotifyUserId: string;
  displayName: string;
  refreshToken: string;
}

function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return createHash('sha256').update(secret).digest();
}

export function sealSession(session: CurationSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function unsealSession(token: string): CurationSession | null {
  const k = key(); // throws loudly on missing SESSION_SECRET — config errors must not look like invalid sessions
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', k, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    return JSON.parse(json) as CurationSession;
  } catch {
    return null;
  }
}
