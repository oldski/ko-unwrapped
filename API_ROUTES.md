# API Routes Documentation

This document outlines all API routes in the application, their data sources, and purposes.

---

## Data Sources

- **Spotify API**: Real-time data from Spotify's Web API
- **Supabase/PostgreSQL**: Historical data stored in the database
- **Both**: Routes that sync between Spotify and the database

---

## Spotify API Only

These routes fetch real-time data directly from Spotify.

### `GET /api/now-playing`
**Purpose**: Get currently playing track with audio features
**Data Source**: Spotify API
**Endpoints Used**:
- `/v1/me/player/currently-playing`
- `/v1/audio-features`

**Returns**:
```json
{
  "isPlaying": true,
  "title": "Track Name",
  "artist": "Artist Name",
  "album": "Album Name",
  "albumImageUrl": "https://...",
  "songUrl": "https://open.spotify.com/track/...",
  "trackId": "spotify_track_id",
  "audioFeatures": {
    "tempo": 120,
    "energy": 0.8,
    "danceability": 0.7,
    "valence": 0.6,
    "acousticness": 0.2,
    "instrumentalness": 0.1,
    "speechiness": 0.05
  }
}
```

---

### `GET /api/spotify-profile`
**Purpose**: Fetch user profile information
**Data Source**: Spotify API
**Endpoint Used**: `/v1/me/`

**Returns**: User profile data (display name, followers, images, etc.)

---

### `GET /api/top-tracks`
**Purpose**: Get user's top tracks (long-term)
**Data Source**: Spotify API
**Endpoint Used**: `/v1/me/top/tracks?limit=10&time_range=long_term`

**Returns**: Array of top tracks with title, artist, URL, cover image

---

### `GET /api/top-tracks-timerange`
**Purpose**: Get top tracks with flexible time range
**Data Source**: Spotify API
**Endpoint Used**: `/v1/me/top/tracks`

**Query Parameters**:
- `time_range`: `short_term` (4 weeks) | `medium_term` (6 months) | `long_term` (years)
- `limit`: Number of tracks (default: 50, max: 50)

**Returns**: Full top tracks response object

---

### `GET /api/top-artists`
**Purpose**: Get user's top artists (long-term)
**Data Source**: Spotify API
**Endpoint Used**: `/v1/me/top/artists?limit=10&time_range=long_term`

**Returns**: Array of artists with id, name, URL, popularity, cover image

---

### `GET /api/recently-played`
**Purpose**: Get user's recently played tracks
**Data Source**: Spotify API
**Endpoint Used**: `/v1/me/player/recently-played`

**Query Parameters**:
- `limit`: Number of tracks (default: 50, max: 50)

**Returns**: Recently played response with items array

---

### `GET /api/audio-features`
**Purpose**: Get audio features for multiple tracks
**Data Source**: Spotify API
**Endpoint Used**: `/v1/audio-features`

**Query Parameters**:
- `ids`: Comma-separated track IDs (REQUIRED)

**Returns**: Array of audio features objects (danceability, energy, valence, tempo, etc.)

---

### `GET /api/audio-analysis/[trackId]`
**Purpose**: Get detailed audio analysis for beat detection
**Data Source**: Spotify API
**Endpoint Used**: `/v1/audio-analysis/{trackId}`

**Route Parameters**:
- `trackId`: Spotify track ID (REQUIRED)

**Returns**: Detailed analysis with bars, beats, sections, segments, tatums, meta, track info

---

### `POST /api/spotify/token`
**Purpose**: OAuth token exchange during Spotify authentication
**Data Source**: Spotify API
**Endpoint Used**: `accounts.spotify.com/api/token`

**Returns**: `refresh_token`, `access_token`, `expires_in`

---

## Supabase Database Only

These routes read/analyze data from the PostgreSQL database (historical listening data).

### `GET /api/stats/history`
**Purpose**: Get play history with optional date range filtering
**Data Source**: PostgreSQL (Supabase)
**Tables Used**: `playHistory`, `tracks`, `trackArtists`, `artists`

**Query Parameters**:
- `start`: ISO date string (optional)
- `end`: ISO date string (optional)
- `limit`: Number of results (default: 100)

**Returns**: Array of plays with track details and artists

---

### `GET /api/stats/top-tracks`
**Purpose**: Get top tracks by play count within time period
**Data Source**: PostgreSQL (Supabase)
**Tables Used**: `playHistory`, `tracks`, `trackArtists`, `artists`

**Query Parameters**:
- `start`: ISO date string (optional)
- `end`: ISO date string (optional)
- `limit`: Number of results (default: 20)

**Returns**: Ranked tracks with play count and artist details

---

### `GET /api/stats/top-artists`
**Purpose**: Get top artists by play count within time period
**Data Source**: PostgreSQL (Supabase)
**Tables Used**: `playHistory`, `tracks`, `trackArtists`, `artists`

**Query Parameters**:
- `start`: ISO date string (optional)
- `end`: ISO date string (optional)
- `limit`: Number of results (default: 20)

**Returns**: Ranked artists with play count

---

### `GET /api/stats/on-this-day`
**Purpose**: Get tracks played on a specific month/day across all years
**Data Source**: PostgreSQL (Supabase)
**Tables Used**: `playHistory`, `tracks`, `trackArtists`, `artists`

**Query Parameters**:
- `monthDay`: MM-DD format (REQUIRED)

**Returns**: Grouped data by year with tracks and artists

---

### `GET /api/stats/monthly-trends`
**Purpose**: Get monthly listening trends over time period
**Data Source**: PostgreSQL (Supabase)
**Tables Used**: `playHistory`, `tracks`, `trackArtists`, `artists`

**Query Parameters**:
- `months`: Number of months to look back (default: 12)

**Returns**: Monthly stats with totalPlays, avgPopularity, uniqueArtists count

---

## Both Sources (Sync Routes)

These routes sync data between Spotify and the database.

### `POST /api/sync/listening-history`
**Purpose**: Sync user's listening history from Spotify to database
**Data Sources**: Spotify API + PostgreSQL

**Process**:
1. Fetches last 50 plays from Spotify (`/v1/me/player/recently-played`)
2. Checks/inserts into `tracks` table
3. Checks/inserts into `artists` table
4. Manages `trackArtists` join table
5. Inserts into `playHistory` table

**Returns**:
```json
{
  "success": true,
  "newPlays": 5,
  "skippedPlays": 45,
  "totalProcessed": 50,
  "message": "Sync completed"
}
```

---

### `GET /api/cron/sync-listening-history`
**Purpose**: Cron job endpoint that triggers sync
**Authorization**: Requires `CRON_SECRET` Bearer token

**Returns**: Wrapper response with cron status

---

## Database Schema

### `tracks`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| spotifyTrackId | VARCHAR | Unique Spotify ID |
| trackName | VARCHAR | Track name |
| durationMs | INTEGER | Duration in milliseconds |
| albumName | VARCHAR | Album name |
| albumImageUrl | VARCHAR | Album cover URL |
| popularity | INTEGER | Spotify popularity score |
| createdAt | TIMESTAMP | Record creation time |
| updatedAt | TIMESTAMP | Last update time |

### `artists`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| spotifyArtistId | VARCHAR | Unique Spotify ID |
| artistName | VARCHAR | Artist name |
| createdAt | TIMESTAMP | Record creation time |

### `trackArtists`
| Column | Type | Description |
|--------|------|-------------|
| trackId | UUID | Foreign key to tracks |
| artistId | UUID | Foreign key to artists |

### `playHistory`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trackId | UUID | Foreign key to tracks |
| playedAt | TIMESTAMP | When the track was played |
| contextType | VARCHAR | Context (playlist, album, etc.) |
| createdAt | TIMESTAMP | Record creation time |

### `audioFeatures`
| Column | Type | Description |
|--------|------|-------------|
| trackId | UUID | Primary key, FK to tracks |
| energy | FLOAT | Energy level (0-1) |
| danceability | FLOAT | Danceability (0-1) |
| valence | FLOAT | Positivity/happiness (0-1) |
| tempo | FLOAT | BPM |
| acousticness | FLOAT | Acoustic confidence (0-1) |
| instrumentalness | FLOAT | Instrumental confidence (0-1) |
| speechiness | FLOAT | Speech presence (0-1) |
| fetchedAt | TIMESTAMP | When features were cached |

---

## Environment Variables Required

```env
# Spotify OAuth
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token

# Database
DATABASE_URL=postgres://...

# Cron Security
CRON_SECRET=your_cron_secret

# App
NEXT_PUBLIC_HOST=http://localhost:3000
```