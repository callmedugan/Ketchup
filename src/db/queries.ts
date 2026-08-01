import { db } from ".";
import { NewUser, User, users } from "./schema";

export async function addUserToDb(user: NewUser): Promise<User | undefined> {
	const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
	return result;
}

export async function getAllUsersFromDb(): Promise<User[] | undefined> {
	try {
		return await db.select().from(users);
	} catch (error: any) {
		// This will print the actual error code and message sent by Postgres
		console.error("Postgres Error Details:", error.cause);
		throw error;
	}

	const result = await db.select().from(users);
	return result;
}
