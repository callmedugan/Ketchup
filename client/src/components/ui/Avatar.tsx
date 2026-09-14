import { isPresetAvatar } from "@ketchup/shared";

type Variant = "tiny" | "small" | "large";

type AvatarProps = { name: string; rawUrl: string; isDisabled?: boolean; variant?: Variant; className?: string };

const sizeStyles: Record<Variant, string> = {
	tiny: "h-4 w-4",
	small: "h-11 w-11",
	large: "h-18 w-18",
};

export default function Avatar({ name, rawUrl, isDisabled = false, variant = "small", className = "" }: AvatarProps) {
	const url = isPresetAvatar(rawUrl) ? `/avatars/${rawUrl}.webp` : rawUrl;

	return (
		<img
			src={url}
			alt={`${name}'s avatar`}
			title={name}
			className={`shrink-0 rounded-full object-cover ${sizeStyles[variant]} ${isDisabled ? "opacity-70" : ""} ${className}`}
		/>
	);
}

type AvatarStackProps = {
	people: { id: string; name: string; avatarUrl: string }[];
	max?: number;
	variant?: "tiny" | "small";
	className?: string;
	/** overrides the default neutral ring, e.g. to reflect a plan's status */
	ringClassName?: string;
	title?: string;
};

/** A row of overlapping avatars - the "who's free with you" indicator, a direct instance of the app's overlap motif. */
export function AvatarStack({ people, max = 3, variant = "tiny", className = "", ringClassName = "ring-surface", title }: AvatarStackProps) {
	const visible = people.slice(0, max);
	const overflow = people.length - visible.length;

	return (
		<div className={`flex shrink-0 -space-x-1.5 ${className}`} title={title ?? people.map((person) => person.name).join(", ")}>
			{visible.map((person) => (
				<Avatar key={person.id} name={person.name} rawUrl={person.avatarUrl} variant={variant} className={`ring-2 ${ringClassName}`} />
			))}

			{overflow > 0 && (
				<span className={`flex h-4 w-4 items-center justify-center rounded-full bg-surface-sunken text-[7px] font-bold text-ink ring-2 ${ringClassName}`}>
					+{overflow}
				</span>
			)}
		</div>
	);
}
