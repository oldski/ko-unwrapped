CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spotify_artist_id" varchar(255) NOT NULL,
	"artist_name" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "artists_spotify_artist_id_unique" UNIQUE("spotify_artist_id")
);
--> statement-breakpoint
CREATE TABLE "audio_features" (
	"track_id" uuid PRIMARY KEY NOT NULL,
	"energy" real,
	"danceability" real,
	"valence" real,
	"tempo" real,
	"acousticness" real,
	"instrumentalness" real,
	"speechiness" real,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "play_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"played_at" timestamp NOT NULL,
	"context_type" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "track_artists" (
	"track_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spotify_track_id" varchar(255) NOT NULL,
	"track_name" varchar(500) NOT NULL,
	"duration_ms" integer NOT NULL,
	"album_name" varchar(500),
	"album_image_url" varchar(1000),
	"popularity" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tracks_spotify_track_id_unique" UNIQUE("spotify_track_id")
);
--> statement-breakpoint
ALTER TABLE "audio_features" ADD CONSTRAINT "audio_features_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spotify_artist_id_idx" ON "artists" USING btree ("spotify_artist_id");--> statement-breakpoint
CREATE INDEX "played_at_idx" ON "play_history" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "track_id_idx" ON "play_history" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_artists_pk" ON "track_artists" USING btree ("track_id","artist_id");--> statement-breakpoint
CREATE INDEX "spotify_track_id_idx" ON "tracks" USING btree ("spotify_track_id");