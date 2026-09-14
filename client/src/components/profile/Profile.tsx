import { useState, type SubmitEvent } from "react";
import type { PresetAvatarType } from "@ketchup/shared";
import Avatar from "../ui/Avatar";
import AvatarPicker from "../ui/AvatarPicker";
import Button from "../ui/Button";
import { Textarea } from "../ui/Input";
import ThemeToggle from "../ui/ThemeToggle";
import { useAuth } from "../../contexts/AuthContext";

export default function Profile() {
	const { user, updateProfile, logout } = useAuth();

	const [bio, setBio] = useState(user?.bio ?? "");
	const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
	const [isEditingBio, setIsEditingBio] = useState(false);
	const [isEditingAvatar, setIsEditingAvatar] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!user) return null;

	const hasChanges = bio !== (user.bio ?? "") || avatarUrl !== user.avatarUrl;

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		// user is guaranteed non-null in render scope, but TypeScript can't carry that
		// narrowing into a nested closure, so re-check before using it
		if (!hasChanges || !user) return;

		setError(null);
		setIsSubmitting(true);

		try {
			await updateProfile({ bio: bio.trim(), timezone: user.timezone, avatarUrl });

			setIsEditingBio(false);
			setIsEditingAvatar(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to update profile.");
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleCancelEdit() {
		if (!user) return;

		setBio(user.bio ?? "");
		setAvatarUrl(user.avatarUrl);
		setIsEditingBio(false);
		setIsEditingAvatar(false);
		setError(null);
	}

	function handleAvatarSelect(preset: PresetAvatarType) {
		setAvatarUrl(preset);
	}

	return (
		<form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl">
			<div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
				<div className="bg-surface-sunken p-3 sm:p-5">
					<div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
						{/* Avatar + name */}
						<div className="flex items-start gap-4">
							<button
								type="button"
								onClick={() => setIsEditingAvatar((current) => !current)}
								className="group relative shrink-0 rounded-full"
								aria-label="Change avatar"
							>
								<Avatar name={user.name} rawUrl={avatarUrl} variant="large" />
								<span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/0 text-[10px] font-bold text-white opacity-0 transition group-hover:bg-ink/40 group-hover:opacity-100">
									Change
								</span>
							</button>

							<div className="min-w-0 flex-1">
								<h2 className="truncate text-xl font-bold text-ink">{user.name}</h2>
							</div>
						</div>

						{isEditingAvatar && (
							<div className="mt-4 border-t border-border pt-4">
								<AvatarPicker value={avatarUrl} onChange={handleAvatarSelect} />
							</div>
						)}

						{/* Profile information */}
						<div className="mt-5 space-y-4 border-t border-border pt-4">
							{/* Bio */}
							<div className="flex items-baseline gap-2">
								<p className="friend-info-label">About</p>

								{isEditingBio ? (
									<Textarea
										value={bio}
										onChange={(event) => setBio(event.target.value)}
										onFocus={(event) => event.currentTarget.select()}
										autoFocus
										rows={3}
										maxLength={300}
										className="min-w-0 flex-1"
									/>
								) : (
									<EditableBioField bio={bio} onClick={() => setIsEditingBio(true)} />
								)}
							</div>

							{/* Timezone */}
							{user.timezone && (
								<div className="flex items-baseline gap-5">
									<p className="friend-info-label">Timezone</p>
									<p className="text-sm font-bold text-ink">{user.timezone}</p>
								</div>
							)}

							{/* Email */}
							<div className="flex items-baseline gap-5">
								<p className="friend-info-label">Email</p>
								<p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{user.email}</p>
							</div>

							{/* Appearance */}
							<div className="flex items-center gap-5">
								<p className="friend-info-label">Theme</p>
								<ThemeToggle />
							</div>
						</div>

						{error && <p className="mt-5 rounded-xl border border-danger/20 bg-danger-tint px-4 py-3 text-sm font-medium text-danger">{error}</p>}

						{/* Actions */}
						<div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
							<Button type="button" variant="danger" onClick={logout}>
								Log out
							</Button>

							<div className="flex items-center gap-3">
								{(isEditingBio || isEditingAvatar) && (
									<Button type="button" variant="secondary" onClick={handleCancelEdit} disabled={isSubmitting}>
										Cancel
									</Button>
								)}

								<Button type="submit" disabled={!hasChanges || isSubmitting}>
									{isSubmitting ? "Saving..." : "Save profile"}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</form>
	);
}

function EditableBioField({ bio, onClick }: { bio: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-surface-sunken"
		>
			<span className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
				{bio || <span className="text-ink-faint">Add a bio...</span>}
			</span>

			<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition group-hover:bg-surface group-hover:text-accent">
				<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
					<path d="M13.5 3.5l3 3M4 16l1-4 8.5-8.5 3 3L8 15l-4 1z" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</span>
		</button>
	);
}
