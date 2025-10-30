CREATE TABLE "word_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"first_shown_on" date NOT NULL,
	"last_shown_on" date NOT NULL,
	"times_shown" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "word_schedules_slug_key";--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "has_dashboard_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "contributor_state" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "contributor_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "contributor_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "contributor_login" text;--> statement-breakpoint
ALTER TABLE "word_schedules" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "word_schedules" ADD COLUMN "assigned_by_user_id" text;--> statement-breakpoint
ALTER TABLE "word_schedules" ADD COLUMN "is_manual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "word_history" ADD CONSTRAINT "word_history_slug_words_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."words"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "word_history_slug_key" ON "word_history" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "word_history_last_shown_idx" ON "word_history" USING btree ("last_shown_on");--> statement-breakpoint
ALTER TABLE "word_schedules" ADD CONSTRAINT "word_schedules_assigned_by_user_id_auth_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_users_role_idx" ON "auth_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "auth_users_contributor_state_idx" ON "auth_users" USING btree ("contributor_state");--> statement-breakpoint
CREATE INDEX "word_schedules_slug_idx" ON "word_schedules" USING btree ("slug");