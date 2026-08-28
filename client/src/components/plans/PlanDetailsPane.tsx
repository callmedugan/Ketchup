import { format, isBefore } from "date-fns";
import type { Plan } from "../../utils/types";
import { useAuth } from "../../contexts/AuthContext";
import ScrollableContainer from "../common/ScrollableContainer";
import HoldButton from "../common/HoldButton";
import Avatar from "../common/Avatar";

type PlanDetailsPaneProps = {
	activePlan: Plan | null;
	error: string | null;
	isSubmitting: boolean;
	handleAccept: (plan: Plan) => Promise<void>;
	handleDecline: (plan: Plan) => Promise<void>;
	handleCancel: (plan: Plan) => Promise<void>;
};

export default function PlanDetailsPane({ activePlan, error, isSubmitting, handleAccept, handleDecline, handleCancel }: PlanDetailsPaneProps) {
	const { user } = useAuth();

	if (!activePlan) {
		return <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-brand-card shadow-sm">{showEmptyState()}</div>;
	}

	const plan = activePlan;

	const isCreator = plan.creatorId === user?.id;
	const isPending = plan.status === "pending";
	const isPast = isBefore(plan.meetTime, new Date());

	const canRespond = isPending && !isCreator && !isPast;
	const canCancel = !isPast && (plan.status === "pending" || plan.status === "confirmed");
	const lastUpdatedByName = plan.lastUpdatedBy === user?.id ? "You" : plan.friendName;

	const status = getDetailStatus(plan, isCreator, isPast, lastUpdatedByName);

	function showHeader() {
		return (
			<div className="shrink-0 border-b border-brand-red-dark bg-brand-red px-4 py-3 sm:px-6">
				<p className="text-xs font-bold uppercase tracking-wide text-brand-cream sm:text-sm">Plan details</p>
			</div>
		);
	}

	function showDetails() {
		return (
			<section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
				<div className="space-y-4 p-4 sm:p-5">
					{showWhen()}
					{showWith()}
					{showWhere()}
					{showWhat()}
					{showStatus()}
				</div>
			</section>
		);
	}

	function showWhen() {
		return (
			<div className="flex items-start gap-3 sm:gap-5">
				<p className="plan-label">When</p>

				<p className="min-w-0 text-xs font-bold leading-relaxed text-brand-text sm:text-sm">{format(plan.meetTime, "EEEE, MMMM d 'at' h:mm a")}</p>
			</div>
		);
	}

	function showWith() {
		return (
			<div className="flex items-center gap-3 sm:gap-5">
				<p className="plan-label">With</p>

				<div className="flex min-w-0 items-center gap-2.5">
					<Avatar name={plan.friendName} rawUrl={plan.friendAvatarUrl} />

					<p className="truncate text-xs font-bold text-brand-text sm:text-sm">{plan.friendName}</p>
				</div>
			</div>
		);
	}

	function showWhere() {
		if (!plan.location) return null;

		return (
			<div className="flex items-start gap-3 sm:gap-5">
				<p className="plan-label">Where</p>

				<p className="min-w-0 wrap-break-word text-xs font-bold text-brand-text sm:text-sm">{plan.location}</p>
			</div>
		);
	}

	function showWhat() {
		return (
			<div className="flex items-start gap-3 sm:gap-5">
				<p className="plan-label">What</p>

				<div className="min-w-0 flex-1">
					<p className="wrap-break-word text-xs font-bold text-brand-text sm:text-sm">{plan.title}</p>

					{plan.comments && <p className="mt-1 whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-brand-muted sm:text-sm">{plan.comments}</p>}
				</div>
			</div>
		);
	}

	function showStatus() {
		return (
			<div className="flex items-start gap-3 sm:gap-5">
				<p className="plan-label mt-1">Status</p>

				<span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:py-1.5 sm:text-xs ${status.className}`}>{status.text}</span>
			</div>
		);
	}

	function showError() {
		if (!error) return null;

		return <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600 sm:px-4 sm:py-3 sm:text-sm">{error}</p>;
	}

	function showActions() {
		if (canRespond) {
			return (
				<div className="flex gap-2 sm:justify-end sm:gap-3">
					<HoldButton variant="secondary" onComplete={() => handleDecline(plan)} disabled={isSubmitting} className="flex-1 sm:flex-none">
						Decline
					</HoldButton>

					<button type="button" onClick={() => handleAccept(plan)} disabled={isSubmitting} className="btn-primary flex-1 sm:flex-none">
						{isSubmitting ? "Accepting..." : "Accept plan"}
					</button>
				</div>
			);
		}

		if (canCancel) {
			return (
				<div className="flex sm:justify-end">
					<HoldButton variant="danger" onComplete={() => handleCancel(plan)} disabled={isSubmitting} className="w-full sm:w-auto">
						Cancel plan
					</HoldButton>
				</div>
			);
		}

		return null;
	}

	return (
		<div
			className={`relative flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm ${
				isPast ? "border-stone-300 bg-stone-100" : "border-stone-200 bg-brand-card"
			}`}
		>
			{showHeader()}

			<ScrollableContainer className="p-3 sm:p-6">
				<div className="mx-auto max-w-2xl space-y-3 sm:space-y-5">
					{showDetails()}
					{showError()}
					{showActions()}
				</div>
			</ScrollableContainer>
		</div>
	);

	function getDetailStatus(plan: Plan, isCreator: boolean, isPast: boolean, lastUpdatedByName: string) {
		switch (plan.status) {
			case "confirmed":
				return { text: "Confirmed", className: "bg-emerald-100 text-emerald-700" };

			case "declined":
				return { text: `Declined by ${lastUpdatedByName}`, className: "bg-stone-200 text-brand-text" };

			case "cancelled":
				return { text: `Cancelled by ${lastUpdatedByName}`, className: "bg-stone-200 text-brand-text" };

			case "pending":
				if (isPast) {
					return { text: "Expired", className: "bg-stone-200 text-brand-text" };
				}

				if (isCreator) {
					return { text: "Invite sent", className: "bg-amber-100 text-amber-700" };
				}

				return { text: "Awaiting response", className: "bg-blue-100 text-blue-700" };
		}
	}
}

function showEmptyState() {
	return (
		<div className="flex h-full min-h-80 items-center justify-center p-5 sm:min-h-100 sm:p-8">
			<div className="max-w-sm text-center">
				<h2 className="text-base font-bold text-brand-text sm:text-lg">Select a plan</h2>

				<p className="mt-1 text-xs font-medium text-brand-muted sm:text-sm">Choose a plan from the list to see details, status, and available actions.</p>
			</div>
		</div>
	);
}
