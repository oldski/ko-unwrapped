import { pgTable, uuid, varchar, timestamp, integer, real, index } from 'drizzle-orm/pg-core';

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
