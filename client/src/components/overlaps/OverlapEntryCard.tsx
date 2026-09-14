import { format } from "date-fns";
import type { ScheduleInstance } from "../calendar/Instance";
import { AvatarStack } from "../ui/Avatar";

type OverlapEntryCardProps = {
	instance: ScheduleInstance;
	onClick: () => void;
};

const MAX_VISIBLE_AVATARS = 4;

export default function OverlapEntryCard({ instance, onClick }: OverlapEntryCardProps) {
	// unique friends overlapping this instance
	const overlapFriends = [...new Map(instance.overlaps.map((overlap) => [overlap.user.id, overlap.user])).values()];

	return (
		<button
			type="button"
			onClick={onClick}
			className="interactive-card flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition hover:border-brand-red-light hover:bg-brand-red-tint/20"
		>
			<div className="min-w-0">
				<p className="text-sm font-bold text-ink">
					{format(instance.start, "p")} – {format(instance.end, "p")}
				</p>
				<p className="mt-0.5 text-xs font-medium text-ink-muted">
					{overlapFriends.length} friend{overlapFriends.length !== 1 ? "s" : ""} free
				</p>
			</div>

			<AvatarStack people={overlapFriends} max={MAX_VISIBLE_AVATARS} variant="small" />
		</button>
	);
}
