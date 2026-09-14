import { useState } from "react";
import { format, isBefore } from "date-fns";
import type { Plan } from "../../utils/types";
import ScrollableContainer from "../common/ScrollableContainer";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import EmptyState from "../ui/EmptyState";
import LoadingSpinner from "../ui/LoadingSpinner";
import SegmentedControl from "../ui/SegmentedControl";
import { usePlans } from "../../contexts/PlansContext";

type PlansListPaneProps = {
	activePlan: Plan | null;
	onSelectPlan: (plan: Plan) => void;
	onClearError: () => void;
};

type StatusFilter = "all" | "pending" | "confirmed";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "pending", label: "Pending" },
	{ value: "confirmed", label: "Confirmed" },
];

export default function PlansListPane({ activePlan, onSelectPlan, onClearError }: PlansListPaneProps) {
	const { plans, getPlanStatusDisplay, isLoadingPlans } = usePlans();

	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	const now = new Date();

	//filter depending on selected status and sort from first upcoming to later
	const visiblePlans = plans
		.filter((plan) => statusFilter === "all" || plan.status === statusFilter)
		.sort((a, b) => a.meetTime.getTime() - b.meetTime.getTime());

	function handleFilterChange(next: StatusFilter) {
		setStatusFilter(next);
		onClearError();
	}

	function showFilterTabs() {
		return (
			<div className="flex shrink-0 items-center border-b border-border bg-surface px-3 py-2.5">
				<SegmentedControl options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={handleFilterChange} />
			</div>
		);
	}

	function showPlans() {
		if (isLoadingPlans) {
			return (
				<div className="flex flex-1 items-center justify-center py-8">
					<LoadingSpinner size={28} />
				</div>
			);
		}

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
					${isSelected ? "translate-x-0.5 text-accent" : "text-ink-muted/40 group-hover:translate-x-0.5 group-hover:text-ink-muted"}
				`}
			>
				<path d="M7 4l6 6-6 6" />
			</svg>
		);
	}

	function showEmptyState() {
		const copy: Record<StatusFilter, { title: string; description: string }> = {
			all: { title: "No plans yet", description: "Make some plans with a friend to get started!" },
			pending: { title: "No pending plans", description: "Plans awaiting a response will show up here." },
			confirmed: { title: "No confirmed plans", description: "Accepted plans will show up here." },
		};

		return <EmptyState title={copy[statusFilter].title} description={copy[statusFilter].description} />;
	}

	return (
		<div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface-sunken shadow-sm">
			{showFilterTabs()}

			{showPlans()}
		</div>
	);
}
