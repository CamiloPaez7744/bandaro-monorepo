CREATE TABLE IF NOT EXISTS "billiard_systems" (
	"id" varchar(60) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(80) NOT NULL,
	"formula" varchar(150) NOT NULL,
	"description" text NOT NULL,
	"difficulty" integer DEFAULT 3 NOT NULL,
	"default_balls" jsonb NOT NULL,
	"default_trajectory" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_levels" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"order_index" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"tag" varchar(50) NOT NULL,
	"subtitle" varchar(150) NOT NULL,
	"description" text NOT NULL,
	"color" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_node_positions" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"node_id" varchar(80) NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" varchar(80) NOT NULL,
	"hint" text,
	"difficulty" integer DEFAULT 3 NOT NULL,
	"white_pos" jsonb NOT NULL,
	"yellow_pos" jsonb NOT NULL,
	"red_pos" jsonb NOT NULL,
	"trajectory" jsonb,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_nodes" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"level_id" varchar(50) NOT NULL,
	"day_number" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"subtitle" varchar(255) NOT NULL,
	"default_status" varchar(20) DEFAULT 'locked' NOT NULL,
	"is_boss" boolean DEFAULT false NOT NULL,
	"xp" integer DEFAULT 100 NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_session_history" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"user_id" varchar(100) DEFAULT 'guest' NOT NULL,
	"total_target" integer DEFAULT 0 NOT NULL,
	"total_hits" integer DEFAULT 0 NOT NULL,
	"accuracy" integer DEFAULT 0 NOT NULL,
	"positions_count" integer DEFAULT 0 NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_node_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"node_id" varchar(80) NOT NULL,
	"status" varchar(20) DEFAULT 'locked' NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"best_accuracy" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token" text NOT NULL,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"auth_provider" varchar(32) DEFAULT 'local' NOT NULL,
	"provider_id" varchar(255),
	"name" varchar(150) NOT NULL,
	"alias" varchar(60) NOT NULL,
	"avatar" varchar(100) DEFAULT 'avatar-01' NOT NULL,
	"nationality" varchar(60) DEFAULT 'Colombia' NOT NULL,
	"country_code" varchar(10) DEFAULT 'CO' NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"max_streak" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"accuracy_avg" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "table_snapshot" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "training_node_positions" ADD CONSTRAINT "training_node_positions_node_id_training_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."training_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_nodes" ADD CONSTRAINT "training_nodes_level_id_training_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."training_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_node_progress" ADD CONSTRAINT "user_node_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_node_progress" ADD CONSTRAINT "user_node_progress_node_id_training_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."training_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billiard_systems_cat_idx" ON "billiard_systems" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_levels_order_idx" ON "training_levels" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "node_positions_node_idx" ON "training_node_positions" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_nodes_level_idx" ON "training_nodes" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_nodes_order_idx" ON "training_nodes" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_history_user_idx" ON "training_session_history" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_node_unique_idx" ON "user_node_progress" USING btree ("user_id","node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_user_idx" ON "user_node_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_node_idx" ON "user_node_progress" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_refresh_token_idx" ON "user_sessions" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_provider_idx" ON "users" USING btree ("auth_provider","provider_id");