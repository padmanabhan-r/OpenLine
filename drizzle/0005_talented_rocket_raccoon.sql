ALTER TABLE "candidates" ADD COLUMN "stage" text DEFAULT 'applied' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status_reason" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status_changed_at" timestamp with time zone;