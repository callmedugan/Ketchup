CREATE TYPE "public"."plan_status" AS ENUM('declined', 'pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."friend_status" AS ENUM('requested', 'accepted', 'declined', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."repeat_type" AS ENUM('once', 'daily', 'weekly');--> statement-breakpoint
CREATE TABLE "friends" (
	"requester_id" uuid NOT NULL,
	"responder_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "friend_status" NOT NULL,
	CONSTRAINT "friends_requester_id_responder_id_pk" PRIMARY KEY("requester_id","responder_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "plan_status" NOT NULL,
	"title" varchar(50) DEFAULT 'New Plan' NOT NULL,
	"comments" varchar(300) DEFAULT '' NOT NULL,
	"meet_time" timestamp with time zone NOT NULL,
	"last_updated_by" uuid,
	"location" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repeat_type" "repeat_type" DEFAULT 'once' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"timezone" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" varchar DEFAULT 'unset' NOT NULL,
	"bio" varchar(300) DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"avatar_url" varchar(255) DEFAULT 'ketchup' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_responder_id_users_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;