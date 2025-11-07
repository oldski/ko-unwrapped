import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	const { code, redirect_uri } = await req.json();
	
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri, // must match exactly what you used at authorize time
	});
	
	const resp = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization:
				'Basic ' +
				Buffer.from(
					`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
				).toString('base64'),
		},
		body,
	});
	
	const data = await resp.json();
	return NextResponse.json(data, { status: resp.status });
}