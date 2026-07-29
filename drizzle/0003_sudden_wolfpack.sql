ALTER TABLE "tracks" ADD COLUMN "bpm" real;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "camelot_key" varchar(3);--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "mix_source" varchar(20);--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "mix_checked_at" timestamp;