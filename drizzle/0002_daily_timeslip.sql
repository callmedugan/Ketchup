ALTER TABLE "plans" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."plan_status";--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('declined', 'pending', 'confirmed');--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "status" SET DATA TYPE "public"."plan_status" USING "status"::"public"."plan_status";--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "title" SET DEFAULT 'New Plan';