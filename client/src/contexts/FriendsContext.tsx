import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "./AuthContext";
import { getFriendsFromParsedJson, getUserSearchResultsFromParsedJson, type Friend, type UserSearchResult } from "../utils/types";
import type { BadgeTone } from "../components/ui/Badge";

/* ========================================================================= */
// context
/* ========================================================================= */

//#region context

type FriendsContextType = {
	friends: Friend[];
	friendsNotificationCount: number;
	isLoadingFriends: boolean;

	fetchFriends: () => Promise<Friend[]>;
	searchUsers: (search: string) => Promise<UserSearchResult[]>;

	getFriendById: (id: string) => Friend | undefined;

	addFriend: (friendId: string) => Promise<Friend[]>;
	deleteFriend: (friendId: string) => Promise<Friend[]>;

	acceptFriend: (friendId: string) => Promise<Friend[]>;
	declineFriend: (friendId: string) => Promise<Friend[]>;
	cancelFriendRequest: (friendId: string) => Promise<Friend[]>;
	removeFriend: (friendId: string) => Promise<Friend[]>;
	blockFriend: (friendId: string) => Promise<Friend[]>;
	unblockFriend: (friendId: string) => Promise<Friend[]>;

	getStatusDisplay: (friend: Friend) => { text: string; tone: BadgeTone };
};

const FriendsContext = createContext<FriendsContextType | null>(null);

//#endregion

/* ========================================================================= */
// provider
/* ========================================================================= */

//#region provider

type FriendsProviderProps = { children: ReactNode };

export const FriendsProvider = ({ children }: FriendsProviderProps) => {
	const { user, authFetch } = useAuth();

	const [friends, setFriends] = useState<Friend[]>([]);
	const [isLoadingFriends, setIsLoadingFriends] = useState(false);

	useEffect(() => {
		if (!user) {
			setFriends([]);
			setIsLoadingFriends(false);
			return;
		}

		setIsLoadingFriends(true);
		fetchFriends().finally(() => setIsLoadingFriends(false));
	}, [user]);

	const friendsNotificationCount = useMemo(() => {
		return friends.filter((friend) => friend.requestDirection === "received" && friend.status === "requested").length;
	}, [friends]);

	//#region api calls

	async function fetchFriends(): Promise<Friend[]> {
		const response = await authFetch(`/api/friends`);

		const data = await response.json();
		if (!response.ok) throw new Error(data.error);

		const friendData = getFriendsFromParsedJson(data);
		if (friendData === undefined) throw new Error("Friend data invalid");

		setFriends(friendData);

		return friendData;
	}

	async function searchUsers(search: string): Promise<UserSearchResult[]> {
		const params = new URLSearchParams({ search: search.trim() });
		const response = await authFetch(`/api/users?${params.toString()}`);

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error ?? "Unable to search for users.");
		}

		const data = await response.json();
		const results = getUserSearchResultsFromParsedJson(data);
		if (results === undefined) throw new Error("Friend data invalid");
		if (results === null) throw new Error("Invalid user search response.");

		return results;
	}

	async function addFriend(friendId: string): Promise<Friend[]> {
		const response = await authFetch(`/api/friends`, { method: "POST", body: JSON.stringify({ friendId }) });

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return fetchFriends();
	}

	async function deleteFriend(friendId: string): Promise<Friend[]> {
		const response = await authFetch(`/api/friends`, { method: "DELETE", body: JSON.stringify({ friendId }) });

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return fetchFriends();
	}

	async function respondToFriendRequest(friendId: string, responseValue: "accepted" | "declined"): Promise<Friend[]> {
		const response = await authFetch(`/api/friends/${friendId}/respond`, { method: "PATCH", body: JSON.stringify({ response: responseValue }) });

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return fetchFriends();
	}

	async function acceptFriend(friendId: string): Promise<Friend[]> {
		return respondToFriendRequest(friendId, "accepted");
	}

	async function declineFriend(friendId: string): Promise<Friend[]> {
		return respondToFriendRequest(friendId, "declined");
	}

	async function cancelFriendRequest(friendId: string): Promise<Friend[]> {
		return deleteFriend(friendId);
	}

	async function removeFriend(friendId: string): Promise<Friend[]> {
		return deleteFriend(friendId);
	}

	async function blockFriend(friendId: string): Promise<Friend[]> {
		const response = await authFetch(`/api/friends/${friendId}/block`, { method: "PUT" });

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		return await fetchFriends();
	}

	async function unblockFriend(friendId: string): Promise<Friend[]> {
		const response = await authFetch(`/api/friends/${friendId}/block`, { method: "DELETE" });

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error ?? "Unable to unblock user");
		}

		return await fetchFriends();
	}

	//#endregion

	/* ========================================================================= */
	// helpers
	/* ========================================================================= */

	function getFriendById(id: string): Friend | undefined {
		return friends.find((friend) => friend.id === id);
	}

	function getStatusDisplay(friend: Friend): { text: string; tone: BadgeTone } {
		switch (friend.status) {
			case "accepted":
				return { text: "Friends", tone: "success" };

			case "requested":
				if (friend.requestDirection === "received") {
					return { text: "New request", tone: "warning" };
				}

				return { text: "Request sent", tone: "neutral" };

			case "declined":
				return { text: "Declined", tone: "neutral" };

			case "blocked":
				return { text: "Blocked", tone: "danger" };
		}
	}

	return (
		<FriendsContext.Provider
			value={{
				friends,
				friendsNotificationCount,
				isLoadingFriends,

				fetchFriends,
				searchUsers,
				getFriendById,

				addFriend,
				deleteFriend,

				acceptFriend,
				declineFriend,
				cancelFriendRequest,
				removeFriend,
				blockFriend,
				unblockFriend,

				getStatusDisplay,
			}}
		>
			{children}
		</FriendsContext.Provider>
	);
};

//#endregion

/* ========================================================================= */
// hook
/* ========================================================================= */

//#region hook

export function useFriends(): FriendsContextType {
	const context = useContext(FriendsContext);

	if (!context) {
		throw new Error("useFriends must be used within a FriendsProvider");
	}

	return context;
}

//#endregion
