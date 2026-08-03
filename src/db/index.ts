import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is missing from environment variables");
}

// Disable prefetch for environments like serverless if needed
const client = postgres(connectionString);
export const db = drizzle(client, { schema }); //, logger: true });
