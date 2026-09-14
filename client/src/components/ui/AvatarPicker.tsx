import { presetAvatarStrings, type PresetAvatarType } from "@ketchup/shared";

type AvatarPickerProps = {
	value: string;
	onChange: (avatar: PresetAvatarType) => void;
	className?: string;
};

export default function AvatarPicker({ value, onChange, className = "" }: AvatarPickerProps) {
	return (
		<div className={`grid grid-cols-6 gap-2 ${className}`}>
			{presetAvatarStrings.map((avatar) => {
				const isSelected = avatar === value;

				return (
					<button
						key={avatar}
						type="button"
						onClick={() => onChange(avatar)}
						aria-label={avatar}
						aria-pressed={isSelected}
						title={avatar}
						className={`aspect-square overflow-hidden rounded-full border-2 transition ${
							isSelected ? "border-accent ring-2 ring-accent/25" : "border-transparent hover:border-border"
						}`}
					>
						<img src={`/avatars/${avatar}.webp`} alt={avatar} className="h-full w-full object-cover" />
					</button>
				);
			})}
		</div>
	);
}
