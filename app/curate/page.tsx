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
      <div className="min-h-screen flex items-center justify-center text-white p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4 text-[var(--color-text-primary)]">
            Curate<span className="text-[var(--color-vibrant-safe)]">.</span>
          </h1>
          {params.denied ? (
            <p className="mb-6 text-[var(--color-text-secondary)]">
              This is Kris&apos;s kitchen — your Spotify account isn&apos;t authorized to cook here.
            </p>
          ) : params.error ? (
            <p className="mb-6 text-[var(--color-text-secondary)]">
              Login didn&apos;t complete ({params.error}). Try again.
            </p>
          ) : (
            <p className="mb-6 text-[var(--color-text-secondary)]">
              Build mixable sets from your listening history. Log in to start.
            </p>
          )}
          <a
            href="/api/auth/login"
            className="inline-block px-6 py-3 rounded-full bg-[var(--color-primary)] text-black font-semibold hover:opacity-90 transition"
          >
            Log in with Spotify
          </a>
          <p className="mt-8 text-[10px] text-[var(--color-text-secondary)]">
            BPM &amp; key data by{' '}
            <a href="https://getsongbpm.com" target="_blank" rel="noreferrer" className="underline hover:text-white">
              GetSongBPM
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <CurateClient displayName={session.displayName} />;
}
