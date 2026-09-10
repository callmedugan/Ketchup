import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { useAuth } from "./AuthContext";
import { buildUserInstances, scheduleWithUserInfoSchema, type ScheduleInstance, type ScheduleWithUserInfo } from "../components/calendar/Instance";
import type { ScheduleRepeatType } from "../utils/types";

/* ========================================================================= */
//                        schemas
/* ========================================================================= */

const scheduleDataSchema = z.object({
	userSchedules: z.array(scheduleWithUserInfoSchema),
	friendSchedules: z.array(scheduleWithUserInfoSchema),
});

/* ========================================================================= */
//                        context
/* ========================================================================= */

type ScheduleContextType = {
	userSchedules: ScheduleWithUserInfo[];
	friendSchedules: ScheduleWithUserInfo[];
	fetchScheduleData: () => Promise<void>;
	buildScheduleInstances: (rangeStart: Date, rangeEnd: Date) => ScheduleInstance[];
	deleteUserSchedule: (id: string) => Promise<void>;
	addUserSchedule: (
		userId: string,
		date: string,
		startTime: string,
		endTime: string,
		repeatType: ScheduleRepeatType,
		timezone: string,
	) => Promise<void>;
};

const ScheduleContext = createContext<ScheduleContextType | null>(null);

/* ========================================================================= */
//                        provider
/* ========================================================================= */

type ScheduleProviderProps = {
	children: ReactNode;
};

export const ScheduleProvider = ({ children }: ScheduleProviderProps) => {
	const { user, authFetch } = useAuth();
	const [userSchedules, setUserSchedules] = useState<ScheduleWithUserInfo[]>([]);
	const [friendSchedules, setFriendSchedules] = useState<ScheduleWithUserInfo[]>([]);

	/* ========================================================================= */
	// initial fetch
	/* ========================================================================= */

	useEffect(() => {
		if (!user) {
			setUserSchedules([]);
			setFriendSchedules([]);
			return;
		}

		fetchScheduleData();
	}, [user]);

	/* ========================================================================= */
	// api calls
	/* ========================================================================= */

	async function fetchScheduleData(): Promise<void> {
		const response = await authFetch("/api/schedules");
		//response
		const data = await response.json();
		if (!response.ok) throw new Error(data.error);
		//parse
		const result = scheduleDataSchema.safeParse(data);
		if (!result.success) throw new Error("Schedule data invalid");
		//set schedules
		setUserSchedules(result.data.userSchedules);
		setFriendSchedules(result.data.friendSchedules);
	}

	async function deleteUserSchedule(id: string): Promise<void> {
		const response = await authFetch("/api/schedules", {
			method: "DELETE",
			body: JSON.stringify({ id }),
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		await fetchScheduleData();
	}

	async function addUserSchedule(
		userId: string,
		date: string,
		startTime: string,
		endTime: string,
		repeatType: ScheduleRepeatType,
		timezone: string,
	): Promise<void> {
		const scheduleStart = new Date(`${date}T${startTime}`);
		const scheduleEnd = new Date(`${date}T${endTime}`);
		const response = await authFetch("/api/schedules", {
			method: "POST",
			body: JSON.stringify({
				userId,
				startTime: scheduleStart.toISOString(),
				endTime: scheduleEnd.toISOString(),
				repeatType,
				timezone,
			}),
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		await fetchScheduleData();
	}

	/* ========================================================================= */
	// instances
	/* ========================================================================= */

	const buildScheduleInstances = useCallback(
		(rangeStart: Date, rangeEnd: Date): ScheduleInstance[] => {
			if (!user) return [];
			return buildUserInstances(userSchedules, friendSchedules, rangeStart, rangeEnd, user.timezone);
		},
		[userSchedules, friendSchedules],
	);

	return (
		<ScheduleContext.Provider
			value={{
				userSchedules,
				friendSchedules,
				fetchScheduleData,
				buildScheduleInstances,
				deleteUserSchedule,
				addUserSchedule,
			}}
		>
			{children}
		</ScheduleContext.Provider>
	);
};

/* ========================================================================= */
//                        hook
/* ========================================================================= */

export function useSchedule(): ScheduleContextType {
	const context = useContext(ScheduleContext);
	if (!context) throw new Error("useSchedule must be used within a ScheduleProvider");
	return context;
}
