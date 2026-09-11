-- Collapse duplicate plays before the unique index can be created.
--
-- The sync deduplicated with a SELECT followed by an INSERT, so a cron run
-- overlapping a manual sync could have both see "not found" and both insert
-- the same play. At the time of writing that had produced 49 extra rows
-- across 29 timestamps; every group was the same track twice, so collapsing
-- them loses no distinct listening data.
--
-- session_tracks references play_history, and each duplicate play had also
-- been materialised into its session as the same track repeated at the next
-- position. Those link rows go first. The table is derived data that
-- lib/curation/extractSessions.ts truncates and rebuilds from play_history,
-- and nothing reads `position`, so the resulting gaps are harmless.

CREATE TEMPORARY TABLE duplicate_plays AS
SELECT "id" FROM (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "played_at"
      ORDER BY "created_at" NULLS LAST, "id"
    ) AS rn
  FROM "play_history"
) ranked
WHERE ranked.rn > 1;
--> statement-breakpoint
DELETE FROM "session_tracks"
WHERE "play_history_id" IN (SELECT "id" FROM duplicate_plays);
--> statement-breakpoint
DELETE FROM "play_history"
WHERE "id" IN (SELECT "id" FROM duplicate_plays);
--> statement-breakpoint
DROP INDEX "played_at_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "played_at_idx" ON "play_history" USING btree ("played_at");
