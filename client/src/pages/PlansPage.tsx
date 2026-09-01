import { useLocation } from "react-router-dom";
import type { MatchedSchedule } from "../utils/types";
import { useState } from "react";
import NewPlanModal from "../components/plans/NewPlansModal";
import PageContainer from "./PageContainer";
import PlansSplitView from "../components/plans/PlansSplitView";

export function PlansPage() {
	const location = useLocation();

	const overlap = location.state?.newPlanOverlap as MatchedSchedule | undefined;
	const [showNewPlanModal, setShowNewPlanModal] = useState(overlap !== undefined);

	return (
		<PageContainer title="Your plans" description="Keep track of what's going down.">
			<PlansSplitView />

			{showNewPlanModal && overlap && <NewPlanModal overlap={overlap} friendName={overlap.friendName} onClose={() => setShowNewPlanModal(false)} />}
		</PageContainer>
	);
}
