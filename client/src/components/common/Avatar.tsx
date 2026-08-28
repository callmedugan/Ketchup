import { isPresetAvatar } from "../../utils/types";

type AvatarProps = { name: string; rawUrl: string; isDisabled?: boolean; variant?: Variant };

type Variant = "small" | "large";

export default function Avatar({ name, rawUrl, isDisabled = false, variant = "small" }: AvatarProps) {
	const url = isPresetAvatar(rawUrl) ? `/avatars/${rawUrl}.webp` : rawUrl;
	return (
		<img
			src={url}
			alt={`${name}'s avatar`}
			className={`${variant === "small" && "h-11 w-11 shrink-0 rounded-full object-cover"}
						${variant === "large" && "h-18 w-18 shrink-0 rounded-full object-cover"}
						${isDisabled ? "opacity-70" : ""}
					`}
		/>
	);
}
