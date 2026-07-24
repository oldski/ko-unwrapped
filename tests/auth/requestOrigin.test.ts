import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { requestOrigin } from '@/lib/auth/requestOrigin';

function makeRequest(host: string | null, proto: string | null): Request {
  const headers: Record<string, string> = {};
  if (host !== null) headers.host = host;
  if (proto !== null) headers['x-forwarded-proto'] = proto;
  return new Request('http://x/', { headers });
}

describe('requestOrigin', () => {
  let savedEnv: string | undefined;

  beforeEach(() => {
    savedEnv = process.env.NEXT_PUBLIC_HOST;
  });

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env.NEXT_PUBLIC_HOST;
    } else {
      process.env.NEXT_PUBLIC_HOST = savedEnv;
    }
  });

  it('allows dev hosts and forces http even if proto says https', () => {
    delete process.env.NEXT_PUBLIC_HOST;
    const req = makeRequest('localhost:3000', 'https');
    expect(requestOrigin(req)).toBe('http://localhost:3000');
  });

  it('allows the other dev host (127.0.0.1:3000) with forced http', () => {
    delete process.env.NEXT_PUBLIC_HOST;
    const req = makeRequest('127.0.0.1:3000', 'https');
    expect(requestOrigin(req)).toBe('http://127.0.0.1:3000');
  });

  it('allows a host matching NEXT_PUBLIC_HOST, honoring forwarded https proto', () => {
    process.env.NEXT_PUBLIC_HOST = 'https://app.example.com';
    const req = makeRequest('app.example.com', 'https');
    expect(requestOrigin(req)).toBe('https://app.example.com');
  });

  it('falls back to the env origin when the host is unrecognized', () => {
    process.env.NEXT_PUBLIC_HOST = 'https://app.example.com';
    const req = makeRequest('evil.attacker.com', 'https');
    expect(requestOrigin(req)).toBe('https://app.example.com');
  });

  it('throws when there is no env origin and the host is unrecognized', () => {
    delete process.env.NEXT_PUBLIC_HOST;
    const req = makeRequest('evil.attacker.com', 'https');
    expect(() => requestOrigin(req)).toThrow(
      'Unable to determine trusted request origin: set NEXT_PUBLIC_HOST'
    );
  });

  it('falls back safely when NEXT_PUBLIC_HOST is malformed', () => {
    process.env.NEXT_PUBLIC_HOST = 'not-a-valid-url';
    const req = makeRequest('evil.attacker.com', 'https');
    // envHost parse fails -> envHost is null -> host match fails -> falls back to raw envOrigin
    expect(requestOrigin(req)).toBe('not-a-valid-url');
  });
});
