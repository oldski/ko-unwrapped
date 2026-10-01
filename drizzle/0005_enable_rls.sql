ALTER TABLE "artist_genres" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audio_features" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discovery_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "listening_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "play_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_tracks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "track_artists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tracks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vibe_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- The app reaches Postgres only through Drizzle as the table owner, which
-- bypasses RLS. Nothing should go through Supabase's REST API, so drop the
-- permissive policies added from the dashboard and leave every table with
-- RLS on and no policies: deny-all for the anon and authenticated roles.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'artist_genres', 'artists', 'audio_features', 'discovery_cache',
        'listening_sessions', 'play_history', 'session_tracks',
        'track_artists', 'tracks', 'vibe_tags'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;--> statement-breakpoint
REVOKE ALL ON "artist_genres", "artists", "audio_features", "discovery_cache",
  "listening_sessions", "play_history", "session_tracks", "track_artists",
  "tracks", "vibe_tags"
FROM anon, authenticated;
