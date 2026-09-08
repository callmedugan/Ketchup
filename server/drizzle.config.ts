//used bc drizzleconfig is outside of tsconfig root dir
/// <reference types="node" />

import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import process from "process";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
