import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getScheduleInstancesFromParsedJson, type ScheduleInstance, type ScheduleRepeatType } from "../utils/types";
import { useAuth } from "./AuthContext";
import { endOfWeek, startOfWeek } from "date-fns";

/* ========================================================================= */
//                        context
/* ========================================================================= */

//#region context

type ScheduleContextType = {
	scheduleInstances: ScheduleInstance[];
	fetchScheduleInstances: (rangeStart?: Date, rangeEnd?: Date) => Promise<ScheduleInstance[]>;
	deleteUserSchedule: (id: string) => Promise<ScheduleInstance[]>;
	addUserSchedule: (
		userId: string,
		date: string,
		startTime: string,
		endTime: string,
		repeatType: ScheduleRepeatType,
		timezone: string,
	) => Promise<ScheduleInstance[]>;
};

const ScheduleContext = createContext<ScheduleContextType | null>(null);

//#endregion

/* ========================================================================= */
//                        provider
/* ========================================================================= */

//#region provider

type ScheduleProviderProps = {
	children: ReactNode;
};

export const ScheduleProvider = ({ children }: ScheduleProviderProps) => {
	const { user, authFetch } = useAuth();

	const [scheduleInstances, setScheduleInstances] = useState<ScheduleInstance[]>([]);

	/* ========================================================================= */
	// initial fetch
	/* ========================================================================= */

	useEffect(() => {
		if (!user) {
			setScheduleInstances([]);
			return;
		}

		fetchScheduleInstances();
	}, [user]);

	/* ========================================================================= */
	// api calls
	/* ========================================================================= */

	//#region api calls

	async function fetchScheduleInstances(rangeStart = startOfWeek(new Date()), rangeEnd = endOfWeek(new Date())): Promise<ScheduleInstance[]> {
		//params
		const params = new URLSearchParams({
			start: rangeStart.toISOString(),
			end: rangeEnd.toISOString(),
		});

		//call
		const response = await authFetch(`/api/instance?${params}`);
		const data = await response.json();
		if (!response.ok) throw new Error(data.error);

		//validate
		const instanceData = getScheduleInstancesFromParsedJson(data);
		if (instanceData == null) throw new Error("Schedule instance data invalid");

		//set state
		setScheduleInstances(instanceData);

		return instanceData;
	}

	async function deleteUserSchedule(id: string): Promise<ScheduleInstance[]> {
		const response = await authFetch("/api/schedules", {
			method: "DELETE",
			body: JSON.stringify({ id }),
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return fetchScheduleInstances();
	}

	async function addUserSchedule(
		userId: string,
		date: string,
		startTime: string,
		endTime: string,
		repeatType: ScheduleRepeatType,
		timezone: string,
	): Promise<ScheduleInstance[]> {
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

		return fetchScheduleInstances();
	}

	//#endregion

	return (
		<ScheduleContext.Provider
			value={{
				scheduleInstances,
				fetchScheduleInstances,
				deleteUserSchedule,
				addUserSchedule,
			}}
		>
			{children}
		</ScheduleContext.Provider>
	);
};

//#endregion

/* ========================================================================= */
//                        hook
/* ========================================================================= */

//#region hook

export function useSchedule(): ScheduleContextType {
	const context = useContext(ScheduleContext);
	if (!context) throw new Error("useSchedule must be used within a ScheduleProvider");

	return context;
}

//#endregion
