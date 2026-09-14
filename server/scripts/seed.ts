// Seeds the local dev database with a handful of users, friendships,
// availability, and plans in varied states - enough to look around the
// app without manually clicking through the whole flow.
//
// Usage: npm run seed --workspace=server (requires PLATFORM=dev in server/.env)

import "dotenv/config";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import { db } from "../src/db/index.js";
import { users, friends, schedules, plans, planSchedules } from "../src/db/schema.js";
import { hashPassword } from "../src/db/auth.js";
import { deleteDb } from "../src/db/queries.js";

const SEED_PASSWORD = "password123";

if (process.env.PLATFORM !== "dev") {
	console.error('Refusing to seed: PLATFORM is not "dev". Set PLATFORM=dev in server/.env before running this against a database.');
	process.exit(1);
}

// wall-clock time in the given timezone, converted to the UTC instant actually stored in the db
function atLocalTime(daysFromNow: number, hour: number, minute: number, timezone: string): Date {
	const day = addDays(startOfDay(new Date()), daysFromNow);
	const wallClock = setMinutes(setHours(day, hour), minute);
	return fromZonedTime(wallClock, timezone);
}

async function main() {
	console.log("Clearing existing data...");
	await deleteDb();

	const hashedPassword = await hashPassword(SEED_PASSWORD);

	console.log("Creating users...");
	const [ketchup, mustard, mayo, sriracha, ranch] = await db
		.insert(users)
		.values([
			{ name: "Ketchup", email: "ketchup@ketchup.test", hashedPassword, avatarUrl: "ketchup", timezone: "America/Los_Angeles", bio: "The main character." },
			{ name: "Mustard", email: "mustard@ketchup.test", hashedPassword, avatarUrl: "mustard", timezone: "America/New_York", bio: "Always down for dinner." },
			{ name: "Mayo", email: "mayo@ketchup.test", hashedPassword, avatarUrl: "mayo", timezone: "America/Chicago", bio: "Coffee enthusiast." },
			{ name: "Sriracha", email: "sriracha@ketchup.test", hashedPassword, avatarUrl: "sriracha", timezone: "America/Los_Angeles", bio: "" },
			{ name: "Ranch", email: "ranch@ketchup.test", hashedPassword, avatarUrl: "ranch", timezone: "America/Denver", bio: "" },
		])
		.returning();

	if (!ketchup || !mustard || !mayo || !sriracha || !ranch) throw new Error("Failed to create seed users");

	console.log("Creating friendships...");
	await db.insert(friends).values([
		{ requesterId: mustard.id, responderId: ketchup.id, status: "accepted" },
		{ requesterId: ketchup.id, responderId: mayo.id, status: "accepted" },
		{ requesterId: sriracha.id, responderId: ketchup.id, status: "requested" }, // incoming request for ketchup to accept
		{ requesterId: ketchup.id, responderId: ranch.id, status: "requested" }, // outgoing request ketchup already sent
	]);

	console.log("Creating availability...");
	const [ketchupToday, ketchupTomorrow] = await db
		.insert(schedules)
		.values([
			{ userId: ketchup.id, repeatType: "once", startTime: atLocalTime(0, 18, 0, ketchup.timezone), endTime: atLocalTime(0, 21, 0, ketchup.timezone) },
			{ userId: ketchup.id, repeatType: "once", startTime: atLocalTime(1, 12, 30, ketchup.timezone), endTime: atLocalTime(1, 16, 0, ketchup.timezone) },
			{ userId: ketchup.id, repeatType: "weekly", startTime: atLocalTime(0, 9, 0, ketchup.timezone), endTime: atLocalTime(0, 11, 0, ketchup.timezone) },
		])
		.returning();

	if (!ketchupToday || !ketchupTomorrow) throw new Error("Failed to create ketchup's seed schedules");

	const [mustardOverlap] = await db
		.insert(schedules)
		.values([{ userId: mustard.id, repeatType: "once", startTime: atLocalTime(0, 19, 0, mustard.timezone), endTime: atLocalTime(0, 22, 0, mustard.timezone) }])
		.returning();

	if (!mustardOverlap) throw new Error("Failed to create mustard's seed schedule");

	await db
		.insert(schedules)
		.values([{ userId: mayo.id, repeatType: "once", startTime: atLocalTime(1, 10, 0, mayo.timezone), endTime: atLocalTime(1, 13, 0, mayo.timezone) }]);

	console.log("Creating plans...");
	const [pendingPlan] = await db
		.insert(plans)
		.values([
			{
				creatorId: ketchup.id,
				friendId: mustard.id,
				status: "pending",
				title: "Dinner tonight",
				comments: "Found this new place downtown, you in?",
				location: "Downtown",
				meetTime: atLocalTime(0, 19, 0, mustard.timezone),
				lastUpdatedBy: ketchup.id,
			},
		])
		.returning();

	if (!pendingPlan) throw new Error("Failed to create seed plan");

	await db.insert(planSchedules).values([
		{ planId: pendingPlan.id, scheduleId: ketchupToday.id },
		{ planId: pendingPlan.id, scheduleId: mustardOverlap.id },
	]);

	await db.insert(plans).values([
		{
			creatorId: mayo.id,
			friendId: ketchup.id,
			status: "confirmed",
			title: "Lunch catch-up",
			comments: "",
			location: "",
			meetTime: atLocalTime(1, 12, 0, mayo.timezone),
			lastUpdatedBy: ketchup.id,
		},
		{
			creatorId: ketchup.id,
			friendId: mustard.id,
			status: "declined",
			title: "Movie night",
			comments: "",
			location: "",
			meetTime: addDays(new Date(), -3),
			lastUpdatedBy: mustard.id,
		},
		{
			creatorId: mustard.id,
			friendId: ketchup.id,
			status: "cancelled",
			title: "Coffee",
			comments: "",
			location: "",
			meetTime: addDays(new Date(), -1),
			lastUpdatedBy: mustard.id,
		},
	]);

	console.log("\nSeed complete. Log in as any of:");
	for (const user of [ketchup, mustard, mayo, sriracha, ranch]) {
		console.log(`  ${user.email}  (password: ${SEED_PASSWORD})`);
	}
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
