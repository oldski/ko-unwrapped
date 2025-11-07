export interface IExternalUrls {
	spotify: string;
}
export interface IFollowers {
	href?: null;
	total: number;
}
export interface IImagesEntity {
	height: number;
	url: string;
	width: number;
}
export interface ICursorAPIResponse {
	after: string;
	before: string;
}
export interface IArtistsAPIResponse {
	external_urls: IExternalUrls;
	followers: IFollowers;
	genres?: string[] | null;
	href: string;
	id: string;
	images?: IImagesEntity[] | null;
	name: string;
	popularity: number;
	type: string;
	uri: string;
}

export interface ISpotifyArtist {
	external_urls: IExternalUrls;
	href: string;
	id: string;
	name: string;
	type: string;
	uri: string;
}

export interface ISpotifyAlbum {
	album_type: string;
	artists: ISpotifyAlbum[];
	available_markets: string[];
	external_urls: IExternalUrls;
	href: string;
	id: string;
	images: IImagesEntity[];
	name: string;
	release_date: string;
	release_date_precision: string;
	total_tracks: number;
	type: string;
	uri: string;
}

export interface ITracksAPIResponse {
	album: ISpotifyAlbum;
	artists: ISpotifyAlbum[];
	available_markets: string[];
	disc_number: number;
	duration_ms: number;
	explicit: boolean;
	external_urls: IExternalUrls;
	href: string;
	id: string;
	is_local: boolean;
	name: string;
	popularity: number;
	preview_url?: string;
	track_number: number;
	type: string;
	uri: string;
}

export interface IProfileAPIResponse {
	display_name: string;
	external_urls: IExternalUrls;
	id: string;
	images: IImagesEntity[] | null;
	type: string;
	followers: IFollowers;
}

export interface IAudioFeatures {
	danceability: number;
	energy: number;
	key: number;
	loudness: number;
	mode: number;
	speechiness: number;
	acousticness: number;
	instrumentalness: number;
	liveness: number;
	valence: number;
	tempo: number;
	duration_ms: number;
	time_signature: number;
	id: string;
	uri: string;
	track_href: string;
	analysis_url: string;
	type: string;
}

export interface IAudioFeaturesResponse {
	audio_features: IAudioFeatures[];
}

export interface ISection {
	start: number;
	duration: number;
	confidence: number;
	loudness: number;
	tempo: number;
	tempo_confidence: number;
	key: number;
	key_confidence: number;
	mode: number;
	mode_confidence: number;
	time_signature: number;
	time_signature_confidence: number;
}

export interface IBeat {
	start: number;
	duration: number;
	confidence: number;
}

export interface IBar {
	start: number;
	duration: number;
	confidence: number;
}

export interface ISegment {
	start: number;
	duration: number;
	confidence: number;
	loudness_start: number;
	loudness_max: number;
	loudness_max_time: number;
	loudness_end: number;
	pitches: number[];
	timbre: number[];
}

export interface IAudioAnalysis {
	bars: IBar[];
	beats: IBeat[];
	sections: ISection[];
	segments: ISegment[];
	tatums: IBeat[];
	meta: {
		analyzer_version: string;
		platform: string;
		detailed_status: string;
		status_code: number;
		timestamp: number;
		analysis_time: number;
		input_process: string;
	};
	track: {
		duration: number;
		sample_md5: string;
		offset_seconds: number;
		window_seconds: number;
		analysis_sample_rate: number;
		analysis_channels: number;
		end_of_fade_in: number;
		start_of_fade_out: number;
		loudness: number;
		tempo: number;
		tempo_confidence: number;
		time_signature: number;
		time_signature_confidence: number;
		key: number;
		key_confidence: number;
		mode: number;
		mode_confidence: number;
	};
}

export interface IRecentlyPlayedItem {
	track: ITracksAPIResponse;
	played_at: string;
	context: {
		type: string;
		href: string;
		external_urls: IExternalUrls;
		uri: string;
	} | null;
}

export interface IRecentlyPlayedResponse {
	items: IRecentlyPlayedItem[];
	next: string | null;
	cursors: {
		after: string;
		before: string;
	};
	limit: number;
	href: string;
}

export interface ITopTracksResponse {
	items: ITracksAPIResponse[];
	total: number;
	limit: number;
	offset: number;
	href: string;
	next: string | null;
	previous: string | null;
}
