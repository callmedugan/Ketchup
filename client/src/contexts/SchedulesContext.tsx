import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
	getMatchedSchedulesFromParsedJson,
	getScheduleFromParsedJson,
	type MatchedSchedule,
	type MatchedScheduleData,
	type Schedule,
	type ScheduleRepeatType,
} from "../utils/types";
import { useAuth } from "./AuthContext";
import { useFriends } from "./FriendsContext";

/* ========================================================================= */
//                        context
/* ========================================================================= */

//#region context
type ScheduleContextType = {
	userSchedules: Schedule[];
	getUserScheduleById: (id: string) => Schedule | undefined;
	matchedSchedules: MatchedSchedule[];
	fetchUserSchedules: () => Promise<Schedule[]>;
	fetchMatchedSchedules: () => Promise<MatchedScheduleData[]>;
	deleteUserSchedule: (id: string) => Promise<Schedule[]>;
	addUserSchedule: (userId: string, date: string, startTime: string, endTime: string, repeatType: ScheduleRepeatType, timezone: string) => Promise<Schedule[]>;
};

const ScheduleContext = createContext<ScheduleContextType | null>(null);

//#endregion

/* ========================================================================= */
//                        provider
/* ========================================================================= */

//#region provider
type ScheduleProviderProps = { children: ReactNode };

export const ScheduleProvider = ({ children }: ScheduleProviderProps) => {
	//needs to be nested inside auth provider
	const { user, authFetch } = useAuth();
	//needs to be nested inside friends provider
	const { friends } = useFriends();

	const [userSchedules, setUserSchedules] = useState<Schedule[]>([]);
	const [matchedSchedulesData, setMatchedSchedulesData] = useState<MatchedScheduleData[]>([]);

	//fetch schedules when user updates
	useEffect(() => {
		if (!user) {
			setUserSchedules([]);
			setMatchedSchedulesData([]);
			return;
		}
		fetchUserSchedules();
		fetchMatchedSchedules();
	}, [user]);

	//only build out the schedules if the data has been changed
	const matchedSchedules: MatchedSchedule[] = useMemo(() => {
		//add other fields
		const result = [];
		for (const s of matchedSchedulesData) {
			const foundFriend = friends.find((friend) => s.userId === friend.id);
			if (foundFriend !== undefined) {
				result.push({ ...s, friendName: foundFriend.name, friendAvatarUrl: foundFriend.avatarUrl });
			}
		}
		return result;
	}, [matchedSchedulesData, friends]);

	//#region api calls

	async function fetchUserSchedules() {
		const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/schedules`);
		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		const data = await response.json();
		const scheduleData = getScheduleFromParsedJson(data);
		if (scheduleData == null) throw new Error("Schedule data invalid");

		setUserSchedules(scheduleData);
		return scheduleData;
	}

	async function fetchMatchedSchedules() {
		const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/friends/overlap`);
		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		//try parse
		const data = await response.json();
		const scheduleData = getMatchedSchedulesFromParsedJson(data);
		if (scheduleData == null) throw new Error("Schedule data invalid");

		//set the raw useEffect
		setMatchedSchedulesData(scheduleData);
		return scheduleData;
	}

	async function deleteUserSchedule(id: string) {
		const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/schedules`, { method: "DELETE", body: JSON.stringify({ id: id }) });
		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return fetchUserSchedules();
	}

	async function addUserSchedule(
		userId: string,
		date: string,
		startTime: string,
		endTime: string,
		repeatType: ScheduleRepeatType,
		timezone: string,
	): Promise<Schedule[]> {
		const scheduleStart = new Date(`${date}T${startTime}`);
		const scheduleEnd = new Date(`${date}T${endTime}`);

		const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/schedules`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId, startTime: scheduleStart.toISOString(), endTime: scheduleEnd.toISOString(), repeatType, timezone }),
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return fetchUserSchedules();
	}
	//#endregion

	function getUserScheduleById(id: string): Schedule | undefined {
		return userSchedules.find((s) => s.id === id);
	}

	return (
		<ScheduleContext.Provider
			value={{ userSchedules, getUserScheduleById, matchedSchedules, fetchUserSchedules, fetchMatchedSchedules, deleteUserSchedule, addUserSchedule }}
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
	if (!context) {
		throw new Error("useSchedule must be used within a ScheduleProvider");
	}
	return context;
}
//#endregion
