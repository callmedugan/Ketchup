export const presetAvatarStrings = [
	"ketchup",
	"mustard",
	"mayo",
	"sriracha",
	"ranch",
	"bbq",
	"honey",
	"soy",
	"relish",
	"hot-sauce",
	"whole-grain-mustard",
	"aioli",
] as const;

export type PresetAvatarType = (typeof presetAvatarStrings)[number];

export function isPresetAvatar(value: string): value is PresetAvatarType {
	return presetAvatarStrings.includes(value as PresetAvatarType);
}
