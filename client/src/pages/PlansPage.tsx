import { useLocation } from "react-router-dom";
import { useState } from "react";

import type { ScheduleInstance } from "../utils/types";

import NewPlanModal from "../components/plans/NewPlansModal";
import PageContainer from "./PageContainer";
import PlansSplitView from "../components/plans/PlansSplitView";

type ScheduleOverlap = ScheduleInstance["overlaps"][number];

type PlansLocationState = {
	newPlanOverlap?: ScheduleOverlap;
	userScheduleId?: string;
};

export function PlansPage() {
	const location = useLocation();

	const state = location.state as PlansLocationState | null;

	const newPlanOverlap = state?.newPlanOverlap;
	const userScheduleId = state?.userScheduleId;

	const [showNewPlanModal, setShowNewPlanModal] = useState(newPlanOverlap !== undefined && userScheduleId !== undefined);

	return (
		<PageContainer title="Your plans" description="Keep track of what's going down.">
			<PlansSplitView />

			{showNewPlanModal && newPlanOverlap && userScheduleId && (
				<NewPlanModal overlap={newPlanOverlap} userScheduleId={userScheduleId} onClose={() => setShowNewPlanModal(false)} />
			)}
		</PageContainer>
	);
}
