import { useState } from "react";
import { useFriends } from "../../contexts/FriendsContext";
import Avatar from "../common/Avatar";
import ScrollableContainer from "../common/ScrollableContainer";
import HoldButton from "../common/HoldButton";
import type { SelectedFriendUser } from "./FriendsSplitView";

type FriendDetailsPaneProps = { activeUser: SelectedFriendUser | null };

export default function FriendDetailsPane({ activeUser }: FriendDetailsPaneProps) {
	const { getStatusDisplay, acceptFriend, declineFriend, cancelFriendRequest, removeFriend, blockFriend, unblockFriend, addFriend } = useFriends();

	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!activeUser) {
		return <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdf8] shadow-sm">{showEmptyState()}</div>;
	}

	const user = activeUser.data;
	const friend = activeUser.type === "friend" ? activeUser.data : undefined;
	const status = friend ? getStatusDisplay(friend) : null;

	/* ========================================================================= */
	// handlers
	/* ========================================================================= */

	async function handleAction(action: () => Promise<unknown>) {
		setError(null);
		setIsSubmitting(true);

		try {
			await action();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleAccept() {
		if (!friend) return;
		await handleAction(() => acceptFriend(friend.id));
	}

	async function handleDecline() {
		if (!friend) return;
		await handleAction(() => declineFriend(friend.id));
	}

	async function handleCancelRequest() {
		if (!friend) return;
		await handleAction(() => cancelFriendRequest(friend.id));
	}

	async function handleRemove() {
		if (!friend) return;
		await handleAction(() => removeFriend(friend.id));
	}

	async function handleBlock() {
		await handleAction(() => blockFriend(user.id));
	}

	async function handleUnblock() {
		if (!friend) return;
		await handleAction(() => unblockFriend(friend.id));
	}

	async function handleAddFriend() {
		await handleAction(() => addFriend(user.id));
	}

	/* ========================================================================= */
	// display
	/* ========================================================================= */

	function showHeader() {
		return (
			<div className="shrink-0 border-b border-brand-red-dark bg-brand-red px-6 py-3">
				<p className="text-sm font-bold uppercase tracking-wide text-brand-cream">Profile</p>
			</div>
		);
	}

	function showProfile() {
		return (
			<section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
				<div className="p-5">
					<div className="flex items-start gap-4">
						<Avatar name={user.name} rawUrl={user.avatarUrl} variant="large" />

						<div className="min-w-0 flex-1">
							<h2 className="truncate text-xl font-bold text-brand-text">{user.name}</h2>

							{friend && <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status?.className}`}>{status?.text}</span>}
						</div>
					</div>

					<div className="mt-5 space-y-4 border-t border-stone-200 pt-4">
						{user.bio && (
							<div className="flex items-baseline gap-5">
								<p className="friend-info-label">About</p>
								<p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{user.bio}</p>
							</div>
						)}
						{user.timezone && (
							<div className="flex items-baseline gap-5">
								<p className="friend-info-label">Timezone</p>
								<p className="text-sm font-bold text-brand-text">{user.timezone}</p>
							</div>
						)}
					</div>
				</div>
			</section>
		);
	}

	function showError() {
		if (!error) return null;

		return <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>;
	}

	function showActions() {
		let primaryActions = null;

		if (!friend) {
			primaryActions = (
				<button type="button" onClick={handleAddFriend} disabled={isSubmitting} className="btn-primary">
					{isSubmitting ? "Sending..." : "Send friend request"}
				</button>
			);
		} else if (friend.status === "requested" && friend.requestDirection === "received") {
			primaryActions = (
				<>
					<HoldButton onComplete={handleDecline} disabled={isSubmitting} variant="secondary">
						Decline
					</HoldButton>

					<button type="button" onClick={handleAccept} disabled={isSubmitting} className="btn-primary">
						{isSubmitting ? "Accepting..." : "Accept request"}
					</button>
				</>
			);
		} else if (friend.status === "requested" && friend.requestDirection === "sent") {
			primaryActions = (
				<HoldButton onComplete={handleCancelRequest} disabled={isSubmitting} variant="secondary">
					Cancel request
				</HoldButton>
			);
		} else if (friend.status === "accepted") {
			primaryActions = (
				<HoldButton onComplete={handleRemove} disabled={isSubmitting} variant="secondary">
					Remove friend
				</HoldButton>
			);
		}

		const isBlockedByUser = friend?.status === "blocked" && friend.requestDirection === "sent";

		if (isBlockedByUser) {
			return (
				<div className="flex justify-end">
					<button type="button" onClick={handleUnblock} disabled={isSubmitting} className="btn-secondary">
						Unblock
					</button>
				</div>
			);
		}

		return (
			<div className="flex justify-end gap-3">
				{primaryActions}

				<HoldButton onComplete={handleBlock} disabled={isSubmitting} variant="danger">
					Block
				</HoldButton>
			</div>
		);
	}

	return (
		<div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdf8] shadow-sm">
			{showHeader()}

			<ScrollableContainer className="p-5 sm:p-6">
				<div className="mx-auto max-w-2xl space-y-5">
					{showProfile()}
					{showError()}
					{showActions()}
				</div>
			</ScrollableContainer>
		</div>
	);
}

function showEmptyState() {
	return (
		<div className="flex h-full min-h-100 items-center justify-center p-8">
			<div className="max-w-sm text-center">
				<h2 className="text-lg font-bold text-brand-text">Select a person</h2>

				<p className="mt-1 text-sm font-medium text-brand-muted">Choose someone from the list to view their profile.</p>
			</div>
		</div>
	);
}
