export type SpotifyCurrentlyPlaying = {
	album: string;
	albumImageUrl: string;
	artist: string;
	isPlaying: boolean;
	songUrl: string;
	title: string;
};

export type SpotifyTrack = {
	id: number;
	title: string;
	url: string;
	coverImage: {
		url: string;
	};
	artist: string;
};

/* Spotify Artist  */
export type SpotifyArtist = {
	id: number;
	name: string;
	url: string;
	coverImage: {
		url: string;
	};
	popularity: number;
};

export type SpotifyAccessToken = {
	access_token: string;
}