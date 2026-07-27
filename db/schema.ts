import { pgTable, uuid, varchar, timestamp, integer, real, index, text, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Tracks table - Unique tracks from Spotify
export const tracks = pgTable('tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  spotifyTrackId: varchar('spotify_track_id', { length: 255 }).unique().notNull(),
  trackName: varchar('track_name', { length: 500 }).notNull(),
  durationMs: integer('duration_ms').notNull(),
  albumName: varchar('album_name', { length: 500 }),
  albumImageUrl: varchar('album_image_url', { length: 1000 }),
  popularity: integer('popularity'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  spotifyTrackIdIdx: index('spotify_track_id_idx').on(table.spotifyTrackId),
}));

// Artists table - Unique artists
export const artists = pgTable('artists', {
  id: uuid('id').defaultRandom().primaryKey(),
  spotifyArtistId: varchar('spotify_artist_id', { length: 255 }).unique().notNull(),
  artistName: varchar('artist_name', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  spotifyArtistIdIdx: index('spotify_artist_id_idx').on(table.spotifyArtistId),
}));

// Track-Artist join table (many-to-many)
export const trackArtists = pgTable('track_artists', {
  trackId: uuid('track_id').references(() => tracks.id).notNull(),
  artistId: uuid('artist_id').references(() => artists.id).notNull(),
}, (table) => ({
  pk: index('track_artists_pk').on(table.trackId, table.artistId),
}));

// Play history - Every time a track is played
export const playHistory = pgTable('play_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  trackId: uuid('track_id').references(() => tracks.id).notNull(),
  playedAt: timestamp('played_at').notNull(),
  contextType: varchar('context_type', { length: 50 }), // playlist, album, artist, etc.
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  playedAtIdx: index('played_at_idx').on(table.playedAt),
  trackIdIdx: index('track_id_idx').on(table.trackId),
}));

// Audio features - Lazy-loaded from Spotify API when Extended Quota is enabled
export const audioFeatures = pgTable('audio_features', {
  trackId: uuid('track_id').references(() => tracks.id).primaryKey(),
  energy: real('energy'),
  danceability: real('danceability'),
  valence: real('valence'),
  tempo: real('tempo'),
  acousticness: real('acousticness'),
  instrumentalness: real('instrumentalness'),
  speechiness: real('speechiness'),
  fetchedAt: timestamp('fetched_at').defaultNow(),
});

// Artist genre cache - populated from Spotify /v1/artists (genres array on each artist)
export const artistGenres = pgTable('artist_genres', {
  artistId: uuid('artist_id').references(() => artists.id).primaryKey(),
  genres: text('genres').array().notNull().default(sql`'{}'::text[]`),
  fetchedAt: timestamp('fetched_at').defaultNow(),
});

// Listening sessions - derived from play_history by splitting on gaps > 30 minutes
export const listeningSessions = pgTable('listening_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at').notNull(),
  trackCount: integer('track_count').notNull(),
  hourOfDay: integer('hour_of_day').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  startedAtIdx: index('sessions_started_at_idx').on(table.startedAt),
}));

// Session-track join, preserves play order inside each session
export const sessionTracks = pgTable('session_tracks', {
  sessionId: uuid('session_id').references(() => listeningSessions.id, { onDelete: 'cascade' }).notNull(),
  trackId: uuid('track_id').references(() => tracks.id).notNull(),
  playHistoryId: uuid('play_history_id').references(() => playHistory.id).notNull(),
  position: integer('position').notNull(),
}, (table) => ({
  sessionIdx: index('session_tracks_session_idx').on(table.sessionId),
  trackIdx: index('session_tracks_track_idx').on(table.trackId),
}));

// Vibe tags - multi-source classifications applied to tracks
// source: 'llm' (Claude inference) | 'genre' (derived from artist genres) | 'context' (listening time/cohort)
export const vibeTags = pgTable('vibe_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  trackId: uuid('track_id').references(() => tracks.id).notNull(),
  tag: varchar('tag', { length: 64 }).notNull(),
  source: varchar('source', { length: 16 }).notNull(),
  confidence: real('confidence').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  trackIdx: index('vibe_tags_track_idx').on(table.trackId),
  tagIdx: index('vibe_tags_tag_idx').on(table.tag),
  uniq: uniqueIndex('vibe_tags_unique').on(table.trackId, table.tag, table.source),
}));

// Discovery cache - memoizes external similarity/resolution lookups (30-day TTL enforced in code)
export const discoveryCache = pgTable('discovery_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  cacheKey: varchar('cache_key', { length: 300 }).unique().notNull(),
  payload: jsonb('payload').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
});
