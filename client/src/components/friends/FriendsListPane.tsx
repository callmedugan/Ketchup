import { useState } from "react";
import type { Friend, UserSearchResult } from "../../utils/types";
import { useFriends } from "../../contexts/FriendsContext";
import type { SelectedFriendUser } from "./FriendsSplitView";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import EmptyState from "../ui/EmptyState";
import LoadingSpinner from "../ui/LoadingSpinner";
import ScrollableContainer from "../common/ScrollableContainer";
import UserSearchBar from "./UserSearchBar";

type FriendsListPaneProps = { activeUser: SelectedFriendUser | null; onSelectUser: (user: SelectedFriendUser) => void; onClearSelection: () => void };

export default function FriendsListPane({ activeUser, onSelectUser, onClearSelection }: FriendsListPaneProps) {
	const { friends, getStatusDisplay, searchUsers } = useFriends();

	type ListMode = "friends" | "requests" | "search";
	const [listMode, setListMode] = useState<ListMode>("friends");
	const [results, setResults] = useState<UserSearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);

	const visibleFriends = friends
		.filter((friend) => {
			if (listMode === "friends") {
				return friend.status === "accepted";
			}

			if (listMode === "requests") {
				return friend.status === "requested" && friend.requestDirection === "received";
			}

			return false;
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	function handleTabChange(mode: ListMode) {
		if (mode === listMode) return;
		setListMode(mode);
		onClearSelection();
	}

	function showFilterTabs() {
		return (
			<div className="grid shrink-0 grid-cols-3 border-b border-border bg-surface">
				<button
					type="button"
					onClick={() => handleTabChange("friends")}
					className={`
					border-r border-border px-4 py-3
					text-sm font-bold transition
					${listMode === "friends" ? "bg-brand-red text-white" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}
				`}
				>
					Friends
				</button>

				<button
					type="button"
					onClick={() => handleTabChange("requests")}
					className={`
					border-r border-border px-4 py-3
					text-sm font-bold transition
					${listMode === "requests" ? "bg-brand-red text-white" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}
				`}
				>
					Requests
				</button>

				<button
					type="button"
					onClick={() => handleTabChange("search")}
					aria-label="Search users"
					className={`
					flex items-center justify-center px-4 py-3
					transition
					${listMode === "search" ? "bg-brand-red text-white" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}
				`}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
						<circle cx="11" cy="11" r="7" />
						<path d="m20 20-4-4" />
					</svg>
				</button>
			</div>
		);
	}

	function showSearch() {
		return <UserSearchBar searchUsers={searchUsers} onResults={setResults} onSearchingChange={setIsSearching} onHasSearchedChange={setHasSearched} />;
	}

	function showFriend(friend: Friend) {
		const isSelected = activeUser?.type === "friend" && activeUser.data.id === friend.id;

		const status = getStatusDisplay(friend);

		return (
			<button
				key={friend.id}
				type="button"
				onClick={() => onSelectUser({ type: "friend", data: friend })}
				className={`group list-item ${isSelected ? "list-item-selected" : ""}`}
			>
				<div className="flex min-w-0 items-center gap-3">
					<Avatar name={friend.name} rawUrl={friend.avatarUrl} />

					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h3 className="truncate font-bold text-ink">{friend.name}</h3>

							{friend.status !== "accepted" && <Badge tone={status.tone}>{status.text}</Badge>}
						</div>

						{friend.bio && <p className="mt-0.5 truncate text-xs font-medium text-ink-muted">{friend.bio}</p>}
					</div>
				</div>

				{showArrow(isSelected)}
			</button>
		);
	}

	function showSearchResult(user: UserSearchResult) {
		const friend = friends.find((friend) => friend.id === user.id);

		const isSelected = activeUser?.data.id === user.id;

		function getRelationshipText() {
			if (!friend) return null;

			if (friend.status === "accepted") {
				return "Already friends";
			}

			if (friend.status === "requested") {
				return friend.requestDirection === "sent" ? "Request sent" : "Request received";
			}

			if (friend.status === "declined") {
				return "Previously declined";
			}

			if (friend.status === "blocked" && friend.requestDirection === "sent") {
				return "Blocked";
			}

			return null;
		}

		const relationshipText = getRelationshipText();

		return (
			<button
				key={user.id}
				type="button"
				onClick={() => {
					if (friend) {
						onSelectUser({ type: "friend", data: friend });
					} else {
						onSelectUser({ type: "search", data: user });
					}
				}}
				className={`group list-item ${isSelected ? "list-item-selected" : ""}`}
			>
				<div className="flex min-w-0 items-center gap-3">
					<Avatar name={user.name} rawUrl={user.avatarUrl} />

					<div className="min-w-0 text-left">
						<h3 className="truncate font-bold text-ink">{user.name}</h3>

						{relationshipText && <p className="mt-0.5 text-xs font-medium text-ink-muted">{relationshipText}</p>}
					</div>
				</div>

				{showArrow(isSelected)}
			</button>
		);
	}

	function showContent() {
		if (listMode === "search") {
			return (
				<ScrollableContainer className="p-3 sm:p-4">
					<div className="flex min-h-full flex-col gap-2.5">
						{isSearching
							? showSearchingState()
							: results.length > 0
								? results.map(showSearchResult)
								: hasSearched
									? showNoResultsState()
									: showSearchEmptyState()}
					</div>
				</ScrollableContainer>
			);
		}

		// Friends or Requests
		return (
			<ScrollableContainer className="p-3 sm:p-4">
				<div className="flex flex-col gap-2.5">
					{visibleFriends.map(showFriend)}

					{visibleFriends.length === 0 && showEmptyState()}
				</div>
			</ScrollableContainer>
		);
	}

	function showArrow(isSelected: boolean) {
		return (
			<svg
				viewBox="0 0 20 20"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={`
					ml-3 h-5 w-5 shrink-0 transition
					${isSelected ? "translate-x-0.5 text-brand-red" : "text-ink-muted/40 group-hover:translate-x-0.5 group-hover:text-ink-muted"}
				`}
			>
				<path d="M7 4l6 6-6 6" />
			</svg>
		);
	}

	function showEmptyState() {
		return (
			<EmptyState
				title={listMode === "friends" ? "No friends yet" : "No requests"}
				description={listMode === "friends" ? "Search for someone to add as a friend." : "Incoming friend requests will show up here."}
			/>
		);
	}

	function showSearchingState() {
		return (
			<div className="flex h-full flex-1 items-center justify-center py-8">
				<LoadingSpinner size={28} />
			</div>
		);
	}

	function showSearchEmptyState() {
		return (
			<div className="flex flex-1 items-center justify-center p-5 text-center">
				<div>
					<h3 className="font-bold text-ink">Find someone</h3>
					<p className="mt-1 text-sm font-medium text-ink-muted">Search for another Ketchup user by name.</p>
				</div>
			</div>
		);
	}

	function showNoResultsState() {
		return (
			<div className="flex flex-1 items-center justify-center p-5 text-center">
				<div>
					<h3 className="font-bold text-ink">No users found</h3>
					<p className="mt-1 text-sm font-medium text-ink-muted">Try a different name.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface-sunken shadow-sm">
			{showFilterTabs()}
			{listMode === "search" && showSearch()}
			{showContent()}
		</div>
	);
}
