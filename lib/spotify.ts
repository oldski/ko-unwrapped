import { SpotifyAccessToken } from "@/types/Spotify";
import {
    IArtistsAPIResponse,
    IProfileAPIResponse,
    ITracksAPIResponse,
    IAudioFeaturesResponse,
    IRecentlyPlayedResponse,
    IAudioAnalysis,
    ITopTracksResponse
} from "./interface";

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

/**
 * Makes a request to the Spotify API to obtain a new access token using a refresh token.
 */
const getAccessToken = async (): Promise<SpotifyAccessToken> => {
    // Make a POST request to the Spotify API to request a new access token
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            // Set the Authorization header with the client ID and client secret encoded in base64
            Authorization: `Basic ${Buffer.from(
              `${client_id}:${client_secret}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        // Set the body of the request to include the refresh token and grant type
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refresh_token!,
        }),
    });
    
    // Return the JSON response from the API
    return response.json();
};

/**
 * Makes a request to the Spotify API to retrieve the user's top tracks.
 */
export const spotifyProfile = async (): Promise<IProfileAPIResponse[]> => {
    // Obtain an access token
    const { access_token }: { access_token: string } = await getAccessToken();
    
    // Make a request to the Spotify API to retrieve the user's top tracks in last 4 weeks
    
    const response = await fetch(
      "https://api.spotify.com/v1/me/",
      {
          headers: {
              // Set the Authorization header with the access token
              Authorization: `Bearer ${access_token}`,
          },
      }
    );
    
    // Handle the response and convert it to the expected type
    if (!response.ok) {
        throw new Error("Failed to fetch top artists.");
    }
    const data = await response.json();
    return data as IProfileAPIResponse[];
};

/**
 * Makes a request to the Spotify API to retrieve the user's top tracks.
 */
export const topTracks = async (): Promise<ITracksAPIResponse[]> => {
    // Obtain an access token
    const { access_token }: { access_token: string } = await getAccessToken();

    // Make a request to the Spotify API to retrieve the user's top tracks in last 4 weeks

    const response = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=long_term",
      {
          headers: {
              // Set the Authorization header with the access token
              Authorization: `Bearer ${access_token}`,
          },
      }
    );

    // Handle the response and convert it to the expected type
    if (!response.ok) {
        throw new Error("Failed to fetch top artists.");
    }
    const data = await response.json();
    return data.items as ITracksAPIResponse[];
};

/**
 * Makes a request to the Spotify API to retrieve the user's top artists.
 */
export const topArtists = async (): Promise<IArtistsAPIResponse[]> => {
    // Obtain an access token
    const { access_token } = await getAccessToken();

    // Make a request to the Spotify API to retrieve the user's top artists in last year
    const response = await fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=10&time_range=long_term",
      {
          headers: {
              // Set the Authorization header with the access token
              Authorization: `Bearer ${access_token}`,
          },
      }
    );

    // Handle the response and convert it to the expected type
    if (!response.ok) {
        throw new Error("Failed to fetch top artists.");
    }

    const data = await response.json();
    return data.items as IArtistsAPIResponse[];
};

/**
 * Makes a request to the Spotify API to retrieve the currently playing song for the user.
 */
export const currentlyPlayingSong = async () => {
    // Obtain an access token
    const { access_token } = await getAccessToken();

    // Make a request to the Spotify API to retrieve the currently playing song for the user
    return fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
            // Set the Authorization header with the access token
            Authorization: `Bearer ${access_token}`,
        },
        next: { revalidate: 0 },
    });
};

/**
 * Generic helper function to make authenticated requests to the Spotify API
 */
const spotifyApi = async (endpoint: string) => {
    // Obtain an access token
    const { access_token } = await getAccessToken();

    // Make the request to the Spotify API
    const response = await fetch(`https://api.spotify.com${endpoint}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });

    // Handle the response
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Spotify API error for ${endpoint}:`, response.status, errorBody);
        throw new Error(`Spotify API request failed: ${response.statusText} - ${errorBody}`);
    }

    return response.json();
};

/**
 * Get audio features for multiple tracks
 * Returns danceability, energy, valence, tempo, and other audio characteristics
 */
export async function getAudioFeatures(trackIds: string[]): Promise<IAudioFeaturesResponse> {
	return spotifyApi(`/v1/audio-features?ids=${trackIds.join(',')}`);
}

/**
 * Get recently played tracks for the user
 * @param limit - Number of tracks to return (max 50)
 */
export async function getRecentlyPlayed(limit = 50): Promise<IRecentlyPlayedResponse> {
	return spotifyApi(`/v1/me/player/recently-played?limit=${limit}`);
}

/**
 * Get audio analysis for a track (for beat detection and detailed analysis)
 * @param trackId - Spotify track ID
 */
export async function getAudioAnalysis(trackId: string): Promise<IAudioAnalysis> {
	return spotifyApi(`/v1/audio-analysis/${trackId}`);
}

/**
 * Get top tracks with time range options
 * @param timeRange - short_term (4 weeks), medium_term (6 months), or long_term (years)
 * @param limit - Number of tracks to return (max 50)
 */
export async function getTopTracksTimeRange(
	timeRange: 'short_term' | 'medium_term' | 'long_term',
	limit = 50
): Promise<ITopTracksResponse> {
	return spotifyApi(`/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`);
}

/**
 * Get multiple artists details
 * @param artistIds - Array of Spotify artist IDs
 */
export async function getArtists(artistIds: string[]): Promise<{ artists: IArtistsAPIResponse[] }> {
	return spotifyApi(`/v1/artists?ids=${artistIds.join(',')}`);
}