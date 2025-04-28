import { NextResponse } from "next/server";
import { spotifyProfile } from "@/lib/spotify";

export async function GET() {
	const data = await spotifyProfile();

	return NextResponse.json(data, { status: 200 });
}