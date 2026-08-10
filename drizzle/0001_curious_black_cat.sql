ALTER TABLE "candidates" ADD COLUMN "profile" jsonb;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "shortlisted" boolean DEFAULT false NOT NULL;