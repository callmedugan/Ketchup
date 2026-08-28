import { useState } from "react";
import { format, isBefore } from "date-fns";
import type { Plan } from "../../utils/types";
import { useAuth } from "../../contexts/AuthContext";
import ScrollableContainer from "../common/ScrollableContainer";
import Avatar from "../common/Avatar";
import { usePlans } from "../../contexts/PlansContext";

type PlansListPaneProps = {
	activePlan: Plan | null;
	onSelectPlan: (plan: Plan) => void;
	onClearError: () => void;
};

export default function PlansListPane({ activePlan, onSelectPlan, onClearError }: PlansListPaneProps) {
	const { user } = useAuth();
	const { plans } = usePlans();

	const [showActiveOnly, setShowActiveOnly] = useState(true);

	const now = new Date();

	//filter depending on toggle and sort from first upcoming to later
	const visiblePlans = plans
		.filter((plan) => {
			const isPast = isBefore(plan.meetTime, now);
			//hide requests you decline - removed
			//const isCreator = plan.creatorId === user?.id;
			//if (plan.status === "declined" && !isCreator) return false;
			//if toggle is on, only show active not past plans
			if (showActiveOnly) return !isPast && (plan.status === "pending" || plan.status === "confirmed");
			//default everything else to true if toggle is off
			return true;
		})
		.sort((a, b) => a.meetTime.getTime() - b.meetTime.getTime());

	function showFilterTabs() {
		return (
			<div className="grid shrink-0 grid-cols-2 border-b border-stone-200 bg-brand-card">
				<button
					type="button"
					onClick={() => {
						setShowActiveOnly(true);
						onClearError();
					}}
					className={`
						border-r border-stone-200 px-4 py-3
						text-sm font-bold transition
						${showActiveOnly ? "bg-brand-red text-brand-cream" : "text-brand-muted hover:bg-[#f3e9df] hover:text-brand-text"}
					`}
				>
					Active
				</button>

				<button
					type="button"
					onClick={() => {
						setShowActiveOnly(false);
						onClearError();
					}}
					className={`
						px-4 py-3 text-sm font-bold transition
						${!showActiveOnly ? "bg-brand-red text-brand-cream" : "text-brand-muted hover:bg-[#f3e9df] hover:text-brand-text"}
					`}
				>
					All
				</button>
			</div>
		);
	}

	function showPlans() {
		return (
			<ScrollableContainer className="p-3 sm:p-4">
				<div className="flex flex-col gap-2.5">
					{visiblePlans.map((plan) => showPlan(plan))}
					{visiblePlans.length === 0 && showEmptyState()}
				</div>
			</ScrollableContainer>
		);
	}

	function showPlan(plan: Plan) {
		const isPast = isBefore(plan.meetTime, now);
		const isInactive = isPast || plan.status === "declined" || plan.status === "cancelled";
		const isSelected = activePlan?.id === plan.id;
		const lastUpdatedByName = plan.lastUpdatedBy === user?.id ? "You" : plan.friendName;
		const status = getPlanStatus(plan, lastUpdatedByName);

		return (
			<button key={plan.id} type="button" onClick={() => onSelectPlan(plan)} className={`group list-item ${isSelected ? "list-item-selected" : ""}`}>
				{showPlanInfo(plan, isInactive, isPast, status)}

				{showArrow(isSelected)}
			</button>
		);
	}

	function showPlanInfo(plan: Plan, isInactive: boolean, isPast: boolean, status: ReturnType<typeof getPlanStatus>) {
		return (
			<div className="flex min-w-0 items-center gap-3">
				<Avatar rawUrl={plan.friendAvatarUrl} name={plan.friendName} isDisabled={isInactive} />

				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h3 className={`truncate font-bold ${isInactive ? "text-brand-muted" : "text-brand-text"}`}>{plan.title}</h3>
						<span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${status.className}`}>{status.text}</span>
					</div>

					<p className={`mt-0.5 text-xs font-medium ${isInactive ? "text-brand-muted/70" : "text-brand-muted"}`}>
						{format(plan.meetTime, "EEE, MMM d ' @ ' h:mm a")}

						{isPast && " · (Past)"}
					</p>
				</div>
			</div>
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
					${isSelected ? "translate-x-0.5 text-brand-red" : "text-brand-muted/40 group-hover:translate-x-0.5 group-hover:text-brand-muted"}
				`}
			>
				<path d="M7 4l6 6-6 6" />
			</svg>
		);
	}

	function showEmptyState() {
		return (
			<div className="rounded-xl border border-dashed border-stone-300 bg-brand-card px-5 py-10 text-center">
				<h3 className="font-bold text-brand-text">{showActiveOnly ? "No active plans" : "No plans yet"}</h3>

				<p className="mx-auto mt-1 max-w-sm text-sm font-medium text-brand-muted">
					{showActiveOnly ? "You don't have any upcoming plans right now." : "Make some plans with a friend to get started!"}
				</p>
			</div>
		);
	}

	function getPlanStatus(plan: Plan, lastUpdatedByName: string) {
		switch (plan.status) {
			case "confirmed":
				return {
					text: "Confirmed",
					className: "bg-emerald-100 text-emerald-700",
				};

			case "declined":
				return {
					text: `Declined by ${lastUpdatedByName}`,
					className: "bg-stone-200 text-brand-text",
				};

			case "cancelled":
				return {
					text: `Cancelled by ${lastUpdatedByName}`,
					className: "bg-stone-200 text-brand-text",
				};

			case "pending":
				if (plan.creatorId === user?.id) {
					return {
						text: "Invite sent",
						className: "bg-amber-100 text-amber-700",
					};
				}

				return {
					text: "Awaiting response",
					className: "bg-blue-100 text-blue-700",
				};
		}
	}

	return (
		<div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-brand-surface shadow-sm">
			{showFilterTabs()}

			{showPlans()}
		</div>
	);
}
