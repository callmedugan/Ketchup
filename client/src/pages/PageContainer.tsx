import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { format } from "date-fns";

import { useAuth } from "../contexts/AuthContext";
import { usePlans } from "../contexts/PlansContext";
import { useFriends } from "../contexts/FriendsContext";
import Avatar from "../components/common/Avatar";

type PageContainerProps = {
	children: ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-brand-cork bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12)_0_1px,transparent_1px),radial-gradient(circle_at_80%_70%,rgba(80,40,20,0.12)_0_1px,transparent_1px)] bg-size-[11px_11px,17px_17px]">
			<main className="relative m-2.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-300/70 bg-brand-page shadow-[0_10px_30px_rgba(60,30,15,0.18)] sm:m-3 md:m-5 md:rounded-3xl lg:m-7">
				<PushPin className="left-2.5 top-2.5 sm:left-5 sm:top-5" />
				<PushPin className="right-2.5 top-2.5 sm:right-5 sm:top-5" />

				<TopNav />

				{/* Page content */}
				<div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5 md:px-8 md:py-6 lg:px-10 lg:py-7">{children}</div>
			</main>
		</div>
	);
}

/* ========================================================================= */
//                        top nav
/* ========================================================================= */

function TopNav() {
	const { user, logout } = useAuth();
	const { plansNotificationCount } = usePlans();
	const { friendsNotificationCount } = useFriends();

	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setCurrentTime(new Date()), 60_000);
		return () => clearInterval(interval);
	}, []);

	const navLinkClass = ({ isActive }: { isActive: boolean }) =>
		`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
			isActive ? "bg-brand-pink text-brand-red shadow-sm" : "text-brand-text hover:bg-brand-card hover:text-brand-red"
		}`;

	return (
		<nav className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-brand-cream bg-[#f6eddf] px-3 py-2.5 shadow-sm sm:px-5">
			{/* Section links */}
			<div className="scrollbar-hidden flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-1.5">
				<NavLink to="/calendar" className={navLinkClass}>
					Calendar
				</NavLink>

				<NavLink to="/plans" className={navLinkClass}>
					<span className="flex items-center">
						Plans
						<NotificationBadge count={plansNotificationCount} />
					</span>
				</NavLink>

				<NavLink to="/friends" className={navLinkClass}>
					<span className="flex items-center">
						Friends
						<NotificationBadge count={friendsNotificationCount} />
					</span>
				</NavLink>

				<NavLink to="/profile" className={navLinkClass}>
					Profile
				</NavLink>
			</div>

			{/* Clock, user, logout */}
			<div className="flex shrink-0 items-center gap-3 sm:gap-4">
				<div className="hidden text-right leading-tight md:block">
					<p className="text-sm font-bold text-brand-text">{format(currentTime, "h:mm a")}</p>
					<p className="text-[10px] font-medium text-brand-muted">{format(currentTime, "EEEE, MMM d")}</p>
				</div>

				{user && (
					<div className="flex min-w-0 items-center gap-2">
						<Avatar name={user.name} rawUrl={user.avatarUrl} />
						<p className="hidden max-w-28 truncate text-sm font-bold text-brand-text sm:block">{user.name}</p>
					</div>
				)}

				<button
					type="button"
					onClick={logout}
					className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold text-brand-muted transition hover:bg-brand-card hover:text-brand-red sm:text-sm"
				>
					Log out
				</button>
			</div>
		</nav>
	);
}

function NotificationBadge({ count }: { count: number }) {
	if (count === 0) return null;

	return (
		<span className="ml-1.5 flex min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
			{count > 9 ? "9+" : count}
		</span>
	);
}

/* ========================================================================= */
//                        push pin
/* ========================================================================= */

function PushPin({ className }: { className: string }) {
	return (
		<div
			className={`absolute z-20 h-2.5 w-2.5 rounded-full border border-brand-red-dark bg-[#a63c32] shadow-[0_2px_3px_rgba(60,30,15,0.35)] sm:h-3.5 sm:w-3.5 ${className}`}
		>
			<div className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-white/30 sm:h-1.5 sm:w-1.5" />
		</div>
	);
}
