// Trusted-origin derivation for OAuth redirects. The Host header is
// attacker-influenceable, so only allowlisted hosts are honored; anything
// else falls back to the configured NEXT_PUBLIC_HOST.
const DEV_HOSTS = new Set(['localhost:3000', '127.0.0.1:3000']);

export function requestOrigin(request: Request): string {
  const host = request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const envOrigin = process.env.NEXT_PUBLIC_HOST ?? null;
  let envHost: string | null = null;
  try {
    envHost = envOrigin ? new URL(envOrigin).host : null;
  } catch {
    envHost = null;
  }
  if (host && DEV_HOSTS.has(host)) return `http://${host}`;
  if (host && envHost && host === envHost) return `${proto}://${host}`;
  if (envOrigin) return envOrigin;
  throw new Error('Unable to determine trusted request origin: set NEXT_PUBLIC_HOST');
}
