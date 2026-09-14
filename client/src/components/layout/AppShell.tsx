import type { ComponentType } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { useFriends } from "../../contexts/FriendsContext";
import { usePlans } from "../../contexts/PlansContext";
import Avatar from "../ui/Avatar";
import BrandMark from "../ui/BrandMark";
import { CalendarIcon, FriendsIcon, LogoutIcon, PlansIcon, ProfileIcon } from "../ui/icons";

type NavItem = {
	to: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
	badge?: number;
};

export default function AppShell() {
	const { user, logout } = useAuth();
	const { friendsNotificationCount } = useFriends();
	const { plansNotificationCount } = usePlans();

	const navItems: NavItem[] = [
		{ to: "/calendar", label: "Calendar", icon: CalendarIcon },
		{ to: "/friends", label: "Friends", icon: FriendsIcon, badge: friendsNotificationCount },
		{ to: "/plans", label: "Plans", icon: PlansIcon, badge: plansNotificationCount },
		{ to: "/profile", label: "Profile", icon: ProfileIcon },
	];

	return (
		<div className="flex h-dvh flex-col bg-canvas md:flex-row">
			{/* Desktop sidebar */}
			<aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
				<div className="flex items-center gap-2 px-5 py-5">
					<BrandMark size={28} />
					<span className="text-xl font-extrabold tracking-tight text-ink">Ketchup</span>
				</div>

				<nav className="flex flex-1 flex-col gap-1 px-3">
					{navItems.map((item) => (
						<SidebarLink key={item.to} item={item} />
					))}
				</nav>

				{user && (
					<div className="border-t border-border p-3">
						<div className="flex items-center gap-2.5 rounded-lg p-2">
							<Avatar name={user.name} rawUrl={user.avatarUrl} variant="small" />

							<p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{user.name}</p>

							<button
								type="button"
								onClick={logout}
								aria-label="Log out"
								className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-sunken hover:text-accent"
							>
								<LogoutIcon className="h-4.5 w-4.5" />
							</button>
						</div>
					</div>
				)}
			</aside>

			{/* Mobile header */}
			<header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
				<div className="flex items-center gap-2">
					<BrandMark size={22} />
					<span className="text-lg font-extrabold tracking-tight text-ink">Ketchup</span>
				</div>

				{user && <Avatar name={user.name} rawUrl={user.avatarUrl} variant="small" />}
			</header>

			{/* Page content */}
			<main className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
					<Outlet />
				</div>
			</main>

			{/* Mobile bottom nav */}
			<nav className="grid shrink-0 grid-cols-4 border-t border-border bg-surface md:hidden">
				{navItems.map((item) => (
					<BottomNavLink key={item.to} item={item} />
				))}
			</nav>
		</div>
	);
}

function SidebarLink({ item }: { item: NavItem }) {
	const Icon = item.icon;

	return (
		<NavLink
			to={item.to}
			className={({ isActive }) =>
				`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
					isActive ? "bg-accent-tint text-accent" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
				}`
			}
		>
			<Icon className="h-5 w-5 shrink-0" />
			<span className="flex-1">{item.label}</span>
			<NotificationBadge count={item.badge} />
		</NavLink>
	);
}

function BottomNavLink({ item }: { item: NavItem }) {
	const Icon = item.icon;

	return (
		<NavLink
			to={item.to}
			className={({ isActive }) =>
				`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition ${isActive ? "text-accent" : "text-ink-muted"}`
			}
		>
			<span className="relative">
				<Icon className="h-5.5 w-5.5" />
				{!!item.badge && (
					<span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-white">
						{item.badge > 9 ? "9+" : item.badge}
					</span>
				)}
			</span>
			{item.label}
		</NavLink>
	);
}

function NotificationBadge({ count }: { count?: number }) {
	if (!count) return null;

	return (
		<span className="flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
			{count > 9 ? "9+" : count}
		</span>
	);
}
