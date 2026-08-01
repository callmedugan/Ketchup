ALTER TABLE "users" DROP CONSTRAINT "users_schedule_id_schedules_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "schedule_id";