CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"name" text NOT NULL,
	"raw_phone" text NOT NULL,
	"phone_e164" text,
	"phone_rejection" text,
	"email" text,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"company_name" text NOT NULL,
	"recruiter_name" text NOT NULL,
	"description" text NOT NULL,
	"fact_sheet" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_region" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"calle_call_id" text,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"task" text NOT NULL,
	"questions" jsonb NOT NULL,
	"refusal_reason" text,
	"refusal_detail" text,
	"structured_result" jsonb,
	"completion_confidence" jsonb,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"guard_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"needs_human" boolean DEFAULT false NOT NULL,
	"needs_human_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reply_token" text,
	"candidate_reply" text,
	"candidate_replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_calls" ADD CONSTRAINT "screening_calls_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_calls" ADD CONSTRAINT "screening_calls_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidates_job_id_idx" ON "candidates" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidates_job_phone_unique" ON "candidates" USING btree ("job_id","phone_e164");--> statement-breakpoint
CREATE INDEX "screening_calls_job_id_idx" ON "screening_calls" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "screening_calls_candidate_id_idx" ON "screening_calls" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "screening_calls_idempotency_key_unique" ON "screening_calls" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "screening_calls_calle_call_id_unique" ON "screening_calls" USING btree ("calle_call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "screening_calls_reply_token_unique" ON "screening_calls" USING btree ("reply_token");