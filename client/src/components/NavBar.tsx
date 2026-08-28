import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import { usePlans } from "../contexts/PlansContext";
import { useFriends } from "../contexts/FriendsContext";
import Avatar from "./common/Avatar";

export default function NavBar() {
	const { user, logout } = useAuth();
	const { plansNotificationCount } = usePlans();
	const { friendsNotificationCount } = useFriends();

	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 60_000);

		return () => clearInterval(interval);
	}, []);

	const navLinkClass = ({ isActive }: { isActive: boolean }) =>
		`rounded-lg px-3 py-2 text-sm font-semibold transition ${
			isActive ? "bg-brand-pink text-brand-red shadow-sm" : "text-brand-text hover:bg-brand-card hover:text-brand-red"
		}`;

	const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
		`relative flex min-w-0 flex-1 items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold transition ${
			isActive ? "bg-brand-pink text-brand-red shadow-sm" : "text-brand-text hover:bg-brand-card hover:text-brand-red"
		}`;

	return (
		<>
			{/* Mobile Navbar */}
			<nav className="shrink-0 border-b border-brand-cream bg-[#f6eddf] px-3 py-2 shadow-md md:hidden">
				<div className="flex items-center gap-2">
					{/* Logo */}
					<div className="shrink-0">
						<Logo showTagLine={false} size="mobile" />
					</div>

					{/* Navigation */}
					<div className="flex min-w-0 flex-1 items-center gap-1">
						<NavLink to="/calendar" className={mobileNavLinkClass}>
							Calendar
						</NavLink>

						<NavLink to="/plans" className={mobileNavLinkClass}>
							Plans
							{showMobileNotificationCount(plansNotificationCount)}
						</NavLink>

						<NavLink to="/friends" className={mobileNavLinkClass}>
							Friends
							{showMobileNotificationCount(friendsNotificationCount)}
						</NavLink>

						<NavLink to="/profile" className={mobileNavLinkClass}>
							Profile
						</NavLink>
					</div>
				</div>
			</nav>

			{/* Desktop Sidebar */}
			<nav className="hidden min-h-screen w-56 shrink-0 border-r border-brand-cream bg-[#f6eddf] px-4 py-6 shadow-xl md:block">
				<div className="flex h-full flex-col">
					{/* Logo card */}
					<div className="relative mb-4 rotate-1 rounded-sm border border-[#ddc9aa] bg-[#fffaf0] px-4 pb-3 pt-5 shadow-xl">
						<div className="absolute left-1/2 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand-red-dark" />

						<Logo showTagLine={false} size="nav" />
					</div>

					{/* Current date / time */}
					<div className="mb-8 px-2 text-center">
						<div className="text-lg font-bold text-brand-text">{format(currentTime, "h:mm a")}</div>
						<div className="text-xs font-medium text-brand-muted">{format(currentTime, "EEEE, MMM d")}</div>
					</div>

					{/* Navigation */}
					<nav className="flex flex-col gap-1.5">
						<NavLink to="/calendar" className={navLinkClass}>
							Calendar
						</NavLink>

						<NavLink to="/plans" className={navLinkClass}>
							<div className="flex items-center">
								<span>Plans</span>
								{showNotificationCount(plansNotificationCount)}
							</div>
						</NavLink>

						<NavLink to="/friends" className={navLinkClass}>
							<div className="flex items-center">
								<span>Friends</span>
								{showNotificationCount(friendsNotificationCount)}
							</div>
						</NavLink>

						<NavLink to="/profile" className={navLinkClass}>
							Profile
						</NavLink>
					</nav>

					<div className="mt-auto">
						{showUserInfo()}

						<div className="border-t border-brand-muted/35 pt-2">
							<button
								type="button"
								onClick={logout}
								className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-muted transition hover:bg-brand-card hover:text-brand-red"
							>
								Log out
							</button>
						</div>

						<div className="mt-4 px-2 text-xs text-brand-muted">
							<p>
								Powered by
								<br />
								React · TypeScript · Node.js
							</p>
						</div>
					</div>
				</div>
			</nav>
		</>
	);

	function showUserInfo() {
		if (!user) return null;

		return (
			<div className="mt-auto">
				<div className="mb-2 flex min-w-0 items-center gap-3 rounded-xl px-2 py-2">
					<Avatar name={user.name} rawUrl={user.avatarUrl} />
					<p className="min-w-0 truncate text-sm font-bold text-brand-text">{user.name}</p>
				</div>
			</div>
		);
	}

	function showNotificationCount(count: number) {
		if (count === 0) return null;

		return (
			<span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-brand-red px-2 py-1.25 text-[10px] font-bold leading-none text-white">
				{count > 9 ? "9+" : count}
			</span>
		);
	}

	function showMobileNotificationCount(count: number) {
		if (count === 0) return null;

		return (
			<span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-bold leading-none text-white">
				{count > 9 ? "9+" : count}
			</span>
		);
	}
}
