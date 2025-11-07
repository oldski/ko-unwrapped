'use client';

import { useState } from 'react';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_HOST}/spotify-auth`;

// All scopes we need for the app
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'user-read-playback-state',
  'user-read-currently-playing',
].join(' ');

export default function SpotifyAuthPage() {
  const [authCode, setAuthCode] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if we have a code in the URL
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const codeFromUrl = urlParams?.get('code');

  // Step 1: Generate authorization URL
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;

  // Step 2: Exchange code for refresh token
  const getRefreshToken = async (code: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(`Error: ${data.error_description || data.error}`);
      } else {
        setRefreshToken(data.refresh_token);
      }
    } catch (err: any) {
      setError(`Failed to get token: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-cyan-500">
          Spotify Authorization Helper
        </h1>
        <p className="text-gray-400 mb-8">
          Follow these steps to get a new refresh token with all required scopes
        </p>

        {/* Step 1: Authorize */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-cyan-500 text-black font-bold rounded-full flex items-center justify-center">
              1
            </div>
            <h2 className="text-2xl font-bold">Authorize with Spotify</h2>
          </div>

          <p className="text-gray-300 mb-4">
            Click the button below to authorize the app with the following scopes:
          </p>

          <div className="bg-black p-4 rounded mb-4">
            <ul className="text-sm space-y-1 text-cyan-400">
              <li>✓ user-read-private - Read your profile</li>
              <li>✓ user-read-email - Read your email</li>
              <li>✓ user-top-read - Read your top tracks/artists</li>
              <li>✓ user-read-recently-played - Read your listening history</li>
              <li>✓ user-read-playback-state - Read your current playback</li>
              <li>✓ user-read-currently-playing - Read what's playing now</li>
            </ul>
          </div>

          <a
            href={authUrl}
            className="inline-block px-6 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors"
          >
            Authorize with Spotify
          </a>
        </div>

        {/* Step 2: Get Code (auto-filled if returned from Spotify) */}
        {codeFromUrl && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-green-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-500 text-black font-bold rounded-full flex items-center justify-center">
                ✓
              </div>
              <h2 className="text-2xl font-bold">Authorization Code Received!</h2>
            </div>

            <p className="text-gray-300 mb-4">
              Great! Spotify redirected you back with an authorization code.
            </p>

            <div className="bg-black p-4 rounded mb-4">
              <p className="text-xs text-gray-500 mb-1">Authorization Code:</p>
              <p className="text-cyan-400 font-mono text-sm break-all">{codeFromUrl}</p>
            </div>

            <button
              onClick={() => getRefreshToken(codeFromUrl)}
              disabled={loading}
              className="px-6 py-3 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Getting Refresh Token...' : 'Get Refresh Token'}
            </button>
          </div>
        )}

        {/* Step 3: Manual Code Entry (backup) */}
        {!codeFromUrl && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-cyan-500 text-black font-bold rounded-full flex items-center justify-center">
                2
              </div>
              <h2 className="text-2xl font-bold">Enter Authorization Code</h2>
            </div>

            <p className="text-gray-300 mb-4">
              After authorizing, you'll be redirected back here automatically. If not, paste the code from the URL:
            </p>

            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Paste authorization code here..."
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white mb-4"
            />

            <button
              onClick={() => getRefreshToken(authCode)}
              disabled={!authCode || loading}
              className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Getting Refresh Token...' : 'Get Refresh Token'}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Step 4: Refresh Token Result */}
        {refreshToken && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-green-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-500 text-black font-bold rounded-full flex items-center justify-center">
                3
              </div>
              <h2 className="text-2xl font-bold">Success! 🎉</h2>
            </div>

            <p className="text-gray-300 mb-4">
              Here's your new refresh token. Copy it and update your <code className="bg-black px-2 py-1 rounded">next.config.mjs</code>:
            </p>

            <div className="bg-black p-4 rounded mb-4">
              <p className="text-xs text-gray-500 mb-1">Refresh Token:</p>
              <p className="text-green-400 font-mono text-sm break-all">{refreshToken}</p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(refreshToken);
                alert('Refresh token copied to clipboard!');
              }}
              className="px-6 py-3 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition-colors mb-4"
            >
              Copy to Clipboard
            </button>

            <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
              <p className="text-yellow-400 font-bold mb-2">Next Steps:</p>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Open <code className="bg-black px-2 py-1 rounded">next.config.mjs</code></li>
                <li>Replace the value of <code className="bg-black px-2 py-1 rounded">SPOTIFY_REFRESH_TOKEN</code></li>
                <li>Restart your dev server</li>
                <li>Test the API endpoints at <code className="bg-black px-2 py-1 rounded">/test-api</code></li>
              </ol>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h3 className="font-bold mb-2 text-cyan-400">What's Happening?</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <p>
              Your current refresh token doesn't have permission to access audio features and recently played data.
              This process will get you a new token with all the scopes needed.
            </p>
            <p className="text-yellow-400">
              <strong>Note:</strong> The old refresh token will still work for basic features, but you need this new one for full functionality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
