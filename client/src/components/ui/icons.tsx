type IconProps = { className?: string };

const commonProps = {
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.8",
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
};

export function CalendarIcon({ className = "h-5 w-5" }: IconProps) {
	return (
		<svg {...commonProps} className={className}>
			<rect x="3.5" y="5" width="17" height="15" rx="2.5" />
			<path d="M3.5 9.5h17" />
			<path d="M8 3v3.5M16 3v3.5" />
		</svg>
	);
}

export function FriendsIcon({ className = "h-5 w-5" }: IconProps) {
	return (
		<svg {...commonProps} className={className}>
			<circle cx="9" cy="9" r="3.25" />
			<path d="M3.5 19c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" />
			<circle cx="17" cy="8" r="2.5" opacity="0.6" />
			<path d="M15.5 13.25c2.62.27 4.5 2.35 4.5 5.25" opacity="0.6" />
		</svg>
	);
}

export function PlansIcon({ className = "h-5 w-5" }: IconProps) {
	return (
		<svg {...commonProps} className={className}>
			<rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
			<path d="M8 3v3M16 3v3M3.5 10h17" />
			<path d="M8 14.5l2.2 2.2L16 11.5" />
		</svg>
	);
}

export function ProfileIcon({ className = "h-5 w-5" }: IconProps) {
	return (
		<svg {...commonProps} className={className}>
			<circle cx="12" cy="8.5" r="3.5" />
			<path d="M4.5 20c0-4.142 3.358-7 7.5-7s7.5 2.858 7.5 7" />
		</svg>
	);
}

export function LogoutIcon({ className = "h-5 w-5" }: IconProps) {
	return (
		<svg {...commonProps} className={className}>
			<path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
			<path d="M14 8l4 4-4 4" />
			<path d="M18 12H9" />
		</svg>
	);
}

export function ChevronUpIcon({ className = "h-4 w-4" }: IconProps) {
	return (
		<svg {...commonProps} className={className}>
			<path d="M5 14l7-7 7 7" />
		</svg>
	);
}

export function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) {
	return (
		<svg {...commonProps} className={className}>
			<path d="M5 10l7 7 7-7" />
		</svg>
	);
}
