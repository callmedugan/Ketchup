import { eq } from "drizzle-orm";
import { db } from ".";
import { Schedule, ScheduleRecord, schedules, User, UserRecord, users } from "./schema";

///////All//////////

export async function deleteAll() {
	await db.delete(users);
	await db.delete(schedules);
}

///////Users////////
export async function addUserToDb(user: User): Promise<UserRecord | undefined> {
	const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
	return result;
}

//need to add filters here - mainly for finding friends?
export async function getAllUsersFromDb(): Promise<UserRecord[] | undefined> {
	const result = await db.select().from(users);
	return result;
}

//////Schedules//////
export async function addScheduleToDb(schedule: Schedule): Promise<ScheduleRecord | undefined> {
	const [result] = await db.insert(schedules).values(schedule).onConflictDoNothing().returning();
	return result;
}

export async function getScheduleByUserFromDb(
	userId: string,
): Promise<ScheduleRecord[] | undefined> {
	const result = await db.select().from(schedules).where(eq(schedules.userId, userId));
	return result;
}
