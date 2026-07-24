import { cookies } from 'next/headers';
import { unsealSession, SESSION_COOKIE, type CurationSession } from './session';

// Returns the session only if it belongs to the authorized owner.
export async function getSession(): Promise<CurationSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = unsealSession(token);
  if (!session) return null;
  if (session.spotifyUserId !== process.env.OWNER_SPOTIFY_USER_ID) return null;
  return session;
}
