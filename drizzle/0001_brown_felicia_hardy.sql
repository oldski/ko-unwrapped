CREATE TABLE "artist_genres" (
	"artist_id" uuid PRIMARY KEY NOT NULL,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listening_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"track_count" integer NOT NULL,
	"hour_of_day" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session_tracks" (
	"session_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"play_history_id" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vibe_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"tag" varchar(64) NOT NULL,
	"source" varchar(16) NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_tracks" ADD CONSTRAINT "session_tracks_session_id_listening_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."listening_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_tracks" ADD CONSTRAINT "session_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_tracks" ADD CONSTRAINT "session_tracks_play_history_id_play_history_id_fk" FOREIGN KEY ("play_history_id") REFERENCES "public"."play_history"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_tags" ADD CONSTRAINT "vibe_tags_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "listening_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "session_tracks_session_idx" ON "session_tracks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_tracks_track_idx" ON "session_tracks" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "vibe_tags_track_idx" ON "vibe_tags" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "vibe_tags_tag_idx" ON "vibe_tags" USING btree ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "vibe_tags_unique" ON "vibe_tags" USING btree ("track_id","tag","source");