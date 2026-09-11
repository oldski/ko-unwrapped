import { getSession } from '@/lib/auth/getSession';
import CurateClient from './CurateClient';

export const dynamic = 'force-dynamic';

export default async function CuratePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; error?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-[var(--ink-primary)]">
        <div className="max-w-md text-center">
          <h1 className="font-display text-5xl mb-4 text-[var(--ink-primary)]">
            Build a set
          </h1>
          {params.denied ? (
            <p className="mb-6 text-[var(--ink-muted)]">
              This is Kris&apos;s kitchen — your Spotify account isn&apos;t authorized to cook here.
            </p>
          ) : params.error ? (
            <p className="mb-6 text-[var(--ink-muted)]">
              Login didn&apos;t complete ({params.error}). Try again.
            </p>
          ) : (
            <p className="mb-6 text-[var(--ink-muted)]">
              Turn your listening history into a set that mixes. Log in to start.
            </p>
          )}
          <a
            href="/api/auth/login"
            className="inline-block px-6 py-3 rounded-lg bg-[var(--surface-signal)] font-semibold text-[var(--ink-on-signal)] transition-opacity hover:opacity-90"
          >
            Log in with Spotify
          </a>
          <p className="mt-8 text-[10px] text-[var(--ink-muted)]">
            BPM &amp; key data by{' '}
            <a href="https://getsongbpm.com" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink-primary)]">
              GetSongBPM
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <CurateClient displayName={session.displayName} />;
}
