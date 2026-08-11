ALTER TABLE "candidates" ADD COLUMN "source" text DEFAULT 'import' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "resume_key" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "parse_status" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "parse_error" text;--> statement-breakpoint
ALTER TABLE "screening_calls" ADD COLUMN "dial_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "screening_calls" ADD COLUMN "script_version" integer DEFAULT 1 NOT NULL;