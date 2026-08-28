import { useState, type SubmitEvent } from "react";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";

export default function Profile() {
	const { user, updateProfile, logout } = useAuth();
	if (!user) return;

	const [bio, setBio] = useState(user.bio ?? "");
	const [isEditingBio, setIsEditingBio] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const hasChanges = bio !== (user.bio ?? "");

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!hasChanges) return;
		if (!user) return;

		setError(null);
		setIsSubmitting(true);

		try {
			await updateProfile({ bio: bio.trim(), timezone: user.timezone, avatarUrl: user.avatarUrl });

			setIsEditingBio(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to update profile.");
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleCancelEdit() {
		if (!user) return;
		setBio(user.bio ?? "");
		setIsEditingBio(false);
		setError(null);
	}

	return (
		<form onSubmit={handleSubmit} className="w-full">
			<div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
				<div className="bg-brand-surface p-3 sm:p-5">
					<div className="rounded-xl border border-stone-200 bg-brand-card p-5 shadow-sm">
						{/* Profile */}
						<div className="flex items-start gap-4">
							<Avatar name={user.name} rawUrl={user.avatarUrl} variant="large" />

							<div className="min-w-0 flex-1">
								<h2 className="truncate text-xl font-bold text-brand-text">{user.name}</h2>
							</div>
						</div>

						{/* Profile information */}
						<div className="mt-5 space-y-4 border-t border-stone-200 pt-4">
							{/* Bio */}
							<div className="flex items-baseline gap-2">
								<p className="friend-info-label">About</p>

								{isEditingBio ? (
									<textarea
										value={bio}
										onChange={(event) => setBio(event.target.value)}
										onFocus={(event) => event.currentTarget.select()}
										autoFocus
										rows={3}
										maxLength={300}
										className="min-w-0 flex-1 resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm leading-relaxed text-brand-text outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
									/>
								) : (
									showEditableField()
								)}
							</div>

							{/* Timezone */}
							{user.timezone && (
								<div className="flex items-baseline gap-5">
									<p className="friend-info-label">Timezone</p>

									<p className="text-sm font-bold text-brand-text">{user.timezone}</p>
								</div>
							)}

							{/* Email */}
							<div className="flex items-baseline gap-5">
								<p className="friend-info-label">Email</p>

								<p className="min-w-0 flex-1 truncate text-sm font-bold text-brand-text">{user.email}</p>
							</div>
						</div>

						{error && <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

						{/* Actions */}
						<div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
							<button type="button" onClick={logout} className="btn-danger">
								Log out
							</button>

							<div className="flex items-center gap-3">
								{isEditingBio && (
									<button type="button" onClick={handleCancelEdit} disabled={isSubmitting} className="btn-secondary">
										Cancel
									</button>
								)}

								<button type="submit" disabled={!hasChanges || isSubmitting} className="btn-primary">
									{isSubmitting ? "Saving..." : "Save profile"}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</form>
	);

	function showEditableField() {
		return (
			<button
				type="button"
				onClick={() => setIsEditingBio(true)}
				className="group flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-brand-surface"
			>
				<span className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-brand-text">
					{bio || <span className="text-brand-muted">Add a bio...</span>}
				</span>

				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-muted transition group-hover:bg-white group-hover:text-brand-red">
					<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
						<path d="M13.5 3.5l3 3M4 16l1-4 8.5-8.5 3 3L8 15l-4 1z" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</span>
			</button>
		);
	}
}
