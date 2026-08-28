import { useState } from "react";
import type { Friend, UserSearchResult } from "../../utils/types";
import { useFriends } from "../../contexts/FriendsContext";
import FriendsListPane from "./FriendsListPane";
import FriendDetailsPane from "./FriendDetailsPane";

export type SelectedFriendUser = { type: "friend"; data: Friend } | { type: "search"; data: UserSearchResult };

export default function FriendsSplitView() {
	const { friends } = useFriends();

	const [selectedUser, setSelectedUser] = useState<SelectedFriendUser | null>(null);

	let activeUser: SelectedFriendUser | null = selectedUser;

	if (selectedUser) {
		const currentFriend = friends.find((friend) => friend.id === selectedUser.data.id);

		if (currentFriend) {
			activeUser = { type: "friend", data: currentFriend };
		} else if (selectedUser.type === "friend") {
			activeUser = {
				type: "search",
				data: {
					id: selectedUser.data.id,
					name: selectedUser.data.name,
					avatarUrl: selectedUser.data.avatarUrl,
					bio: selectedUser.data.bio,
					timezone: selectedUser.data.timezone,
				},
			};
		}
	}

	function handleSelectUser(user: SelectedFriendUser) {
		setSelectedUser(user);
	}

	function handleBack() {
		setSelectedUser(null);
	}

	return (
		<div className="min-h-0 flex-1">
			{/* Mobile */}
			<div className="relative h-full md:hidden">
				{/* Keep list mounted so its internal state is preserved */}
				<div className={activeUser ? "hidden h-full" : "h-full"}>
					<FriendsListPane activeUser={activeUser} onSelectUser={handleSelectUser} onClearSelection={() => setSelectedUser(null)} />
				</div>

				{/* Details */}
				{activeUser && (
					<div className="flex h-full min-h-0 flex-col">
						<div className="shrink-0 pb-3">
							<button
								type="button"
								onClick={handleBack}
								className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-brand-text transition active:scale-[0.97] active:bg-brand-surface"
							>
								&lt; Back
							</button>
						</div>

						<div className="min-h-0 flex-1">
							<FriendDetailsPane activeUser={activeUser} />
						</div>
					</div>
				)}
			</div>

			{/* Desktop */}
			<div className="hidden h-full min-h-0 grid-cols-[minmax(300px,0.85fr)_minmax(0,1.35fr)] gap-4 md:grid">
				<FriendsListPane activeUser={activeUser} onSelectUser={handleSelectUser} onClearSelection={() => setSelectedUser(null)} />

				<FriendDetailsPane activeUser={activeUser} />
			</div>
		</div>
	);
}
