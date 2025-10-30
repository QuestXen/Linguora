CREATE TABLE "word_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"scheduled_for" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "words" (
	"slug" text PRIMARY KEY NOT NULL,
	"en_word" text NOT NULL,
	"en_ipa" text,
	"en_definition" text NOT NULL,
	"en_example" text NOT NULL,
	"de_word" text NOT NULL,
	"de_ipa" text,
	"de_definition" text NOT NULL,
	"de_example" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_schedules" ADD CONSTRAINT "word_schedules_slug_words_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."words"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "word_schedules_scheduled_for_key" ON "word_schedules" USING btree ("scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "word_schedules_slug_key" ON "word_schedules" USING btree ("slug");