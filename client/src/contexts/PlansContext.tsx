import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "./AuthContext";
import { getPlansFromParsedJson, type Plan, type PlanData } from "../utils/types";
import { useFriends } from "./FriendsContext";

/* ========================================================================= */
//                        context
/* ========================================================================= */

//#region context

type PlansContextType = {
	plans: Plan[];
	plansNotificationCount: number;
	fetchPlans: () => Promise<PlanData[]>;
	getPlanById: (id: string) => PlanData | undefined;
	addPlan: (friendId: string, title: string, comments: string, meetTime: Date, location: string) => Promise<PlanData[]>;
	cancelPlan: (id: string) => Promise<PlanData[]>;
	updatePlanStatus: (id: string, response: "accepted" | "declined") => Promise<PlanData[]>;
};

const PlansContext = createContext<PlansContextType | null>(null);

//#endregion

/* ========================================================================= */
//                        provider
/* ========================================================================= */

//#region provider

type PlansProviderProps = { children: ReactNode };

export const PlansProvider = ({ children }: PlansProviderProps) => {
	//needs to be nested inside auth provider
	const { user, authFetch } = useAuth();
	//needs to be nested inside friends provider
	const { friends } = useFriends();

	const [plansData, setPlansData] = useState<PlanData[]>([]);

	// fetch plans when user updates
	useEffect(() => {
		if (!user) {
			setPlansData([]);
			return;
		}

		fetchPlans();
	}, [user]);

	//only build out if the data has been changed
	const plans: Plan[] = useMemo(() => {
		if (friends.length === 0) return [];
		//add other fields
		const result = [];
		for (const p of plansData) {
			//find using friend in either creator or friend field
			const foundFriend = p.creatorId === user!.id ? friends.find((friend) => p.friendId === friend.id) : friends.find((friend) => p.creatorId === friend.id);
			if (foundFriend !== undefined) {
				result.push({ ...p, friendName: foundFriend.name, friendAvatarUrl: foundFriend.avatarUrl });
			} //else console.error("failed to find friend data for: " + p.title);
		}
		return result;
	}, [plansData, friends]);

	const plansNotificationCount = useMemo(() => {
		return plans.filter((plan) => plan.friendId === user?.id && plan.status === "pending").length;
	}, [plans]);

	//#region api calls

	async function fetchPlans(): Promise<PlanData[]> {
		const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/plans`);

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		const data = await response.json();
		const planData = getPlansFromParsedJson(data);
		if (planData == null) throw new Error("Plan data invalid");

		setPlansData(planData);

		return planData;
	}

	async function addPlan(friendId: string, title: string, comments: string, meetTime: Date, location: string): Promise<PlanData[]> {
		const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/plans`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ friendId, title, comments, meetTime, location }),
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return fetchPlans();
	}

	async function cancelPlan(id: string): Promise<PlanData[]> {
		const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/plans/${id}`, { method: "DELETE" });

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return fetchPlans();
	}

	async function updatePlanStatus(id: string, response: "accepted" | "declined"): Promise<PlanData[]> {
		const fetchResponse = await authFetch(`${import.meta.env.VITE_API_URL}/api/plans/${id}/respond`, { method: "PATCH", body: JSON.stringify({ response }) });

		if (!fetchResponse.ok) {
			const data = await fetchResponse.json();
			throw new Error(data.error);
		}

		return fetchPlans();
	}

	//#endregion

	function getPlanById(id: string): PlanData | undefined {
		return plansData.find((plan) => plan.id === id);
	}

	return (
		<PlansContext.Provider value={{ plans, fetchPlans, getPlanById, addPlan, cancelPlan, updatePlanStatus, plansNotificationCount }}>
			{children}
		</PlansContext.Provider>
	);
};

//#endregion

/* ========================================================================= */
//                        hook
/* ========================================================================= */

//#region hook

export function usePlans(): PlansContextType {
	const context = useContext(PlansContext);

	if (!context) {
		throw new Error("usePlans must be used within a PlansProvider");
	}

	return context;
}

//#endregion
