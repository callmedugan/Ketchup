import { z } from "zod";

export const timezoneSchema = z
	.string()
	.trim()
	.refine(
		(value) => {
			try {
				new Intl.DateTimeFormat("en-US", { timeZone: value });
				return true;
			} catch {
				return false;
			}
		},
		{ message: "Invalid timezone" },
	);

export type Timezone = z.infer<typeof timezoneSchema>;
