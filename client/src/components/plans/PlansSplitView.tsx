import { useState } from "react";
import type { Plan } from "../../utils/types";
import { usePlans } from "../../contexts/PlansContext";
import PlanDetailsPane from "./PlanDetailsPane";
import PlansListPane from "./PlansListPane";

export default function PlansSplitView() {
	const { plans, updatePlanStatus, cancelPlan } = usePlans();

	const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const activePlan = selectedPlan ? (plans.find((plan) => plan.id === selectedPlan.id) ?? selectedPlan) : null;

	//#region handlers

	function handleSelectPlan(plan: Plan) {
		setSelectedPlan(plan);
		setError(null);
	}

	function handleBack() {
		setSelectedPlan(null);
		setError(null);
	}

	async function handleAccept(plan: Plan) {
		setError(null);
		setIsSubmitting(true);

		try {
			await updatePlanStatus(plan.id, "accepted");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong while accepting the plan.");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDecline(plan: Plan) {
		setError(null);
		setIsSubmitting(true);

		try {
			await updatePlanStatus(plan.id, "declined");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong while declining the plan.");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleCancel(plan: Plan) {
		setError(null);
		setIsSubmitting(true);

		try {
			await cancelPlan(plan.id);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong while cancelling the plan.");
		} finally {
			setIsSubmitting(false);
		}
	}

	//#endregion

	return (
		<div className="min-h-0 flex-1">
			{/* Mobile */}
			<div className="relative h-full md:hidden">
				{/* Keep list mounted so its internal state is preserved */}
				<div className={activePlan ? "hidden h-full" : "h-full"}>
					<PlansListPane activePlan={activePlan} onSelectPlan={handleSelectPlan} onClearError={() => setError(null)} />
				</div>

				{/* Details */}
				{activePlan && (
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
							<PlanDetailsPane
								activePlan={activePlan}
								error={error}
								isSubmitting={isSubmitting}
								handleAccept={handleAccept}
								handleDecline={handleDecline}
								handleCancel={handleCancel}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Desktop */}
			<div className="hidden h-full min-h-0 grid-cols-[minmax(300px,0.85fr)_minmax(0,1.35fr)] gap-4 md:grid">
				<PlansListPane activePlan={activePlan} onSelectPlan={handleSelectPlan} onClearError={() => setError(null)} />

				<PlanDetailsPane
					activePlan={activePlan}
					error={error}
					isSubmitting={isSubmitting}
					handleAccept={handleAccept}
					handleDecline={handleDecline}
					handleCancel={handleCancel}
				/>
			</div>
		</div>
	);
}
