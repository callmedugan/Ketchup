import { useState } from "react";
import { format, isBefore } from "date-fns";
import type { Plan } from "../../utils/types";
import ScrollableContainer from "../common/ScrollableContainer";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import EmptyState from "../ui/EmptyState";
import { usePlans } from "../../contexts/PlansContext";

type PlansListPaneProps = {
	activePlan: Plan | null;
	onSelectPlan: (plan: Plan) => void;
	onClearError: () => void;
};

export default function PlansListPane({ activePlan, onSelectPlan, onClearError }: PlansListPaneProps) {
	const { plans, getPlanStatusDisplay } = usePlans();

	const [showActiveOnly, setShowActiveOnly] = useState(true);

	const now = new Date();

	//filter depending on toggle and sort from first upcoming to later
	const visiblePlans = plans
		.filter((plan) => {
			const isPast = isBefore(plan.meetTime, now);
			if (showActiveOnly) return !isPast && (plan.status === "pending" || plan.status === "confirmed");
			return true;
		})
		.sort((a, b) => a.meetTime.getTime() - b.meetTime.getTime());

	function showFilterTabs() {
		return (
			<div className="grid shrink-0 grid-cols-2 border-b border-border bg-surface">
				<button
					type="button"
					onClick={() => {
						setShowActiveOnly(true);
						onClearError();
					}}
					className={`
						border-r border-border px-4 py-3
						text-sm font-bold transition
						${showActiveOnly ? "bg-brand-red text-white" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}
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
						${!showActiveOnly ? "bg-brand-red text-white" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}
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
		const status = getPlanStatusDisplay(plan, isPast);

		return (
			<button key={plan.id} type="button" onClick={() => onSelectPlan(plan)} className={`group list-item ${isSelected ? "list-item-selected" : ""}`}>
				{showPlanInfo(plan, isInactive, isPast, status)}

				{showArrow(isSelected)}
			</button>
		);
	}

	function showPlanInfo(plan: Plan, isInactive: boolean, isPast: boolean, status: ReturnType<typeof getPlanStatusDisplay>) {
		return (
			<div className="flex min-w-0 items-center gap-3">
				<Avatar rawUrl={plan.friendAvatarUrl} name={plan.friendName} isDisabled={isInactive} />

				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h3 className={`truncate font-bold ${isInactive ? "text-ink-muted" : "text-ink"}`}>{plan.title}</h3>
						<Badge tone={status.tone}>{status.text}</Badge>
					</div>

					<p className={`mt-0.5 text-xs font-medium ${isInactive ? "text-ink-muted/70" : "text-ink-muted"}`}>
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
				title={showActiveOnly ? "No active plans" : "No plans yet"}
				description={showActiveOnly ? "You don't have any upcoming plans right now." : "Make some plans with a friend to get started!"}
			/>
		);
	}

	return (
		<div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface-sunken shadow-sm">
			{showFilterTabs()}

			{showPlans()}
		</div>
	);
}
