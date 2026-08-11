CREATE TABLE "ball_position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"ball_label" text NOT NULL,
	"pos_x" numeric(5, 4) NOT NULL,
	"pos_y" numeric(5, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"source_image_url" text
);
--> statement-breakpoint
ALTER TABLE "ball_position" ADD CONSTRAINT "ball_position_snapshot_id_table_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."table_snapshot"("id") ON DELETE cascade ON UPDATE no action;