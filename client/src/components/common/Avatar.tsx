import { isPresetAvatar } from "../../utils/types";

type AvatarProps = { name: string; rawUrl: string; isDisabled?: boolean; variant?: Variant; className?: string };

type Variant = "tiny" | "small" | "large";

export default function Avatar({ name, rawUrl, isDisabled = false, variant = "small", className = "" }: AvatarProps) {
	const url = isPresetAvatar(rawUrl) ? `/avatars/${rawUrl}.webp` : rawUrl;
	return (
		<img
			src={url}
			alt={`${name}'s avatar`}
			title={name}
			className={`${variant === "tiny" && "h-4 w-4 shrink-0 rounded-full object-cover"}
						${variant === "small" && "h-11 w-11 shrink-0 rounded-full object-cover"}
						${variant === "large" && "h-18 w-18 shrink-0 rounded-full object-cover"}
						${isDisabled ? "opacity-70" : ""}
						${className}
					`}
		/>
	);
}
