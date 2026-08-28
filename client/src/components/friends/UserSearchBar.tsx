import { useEffect, useState } from "react";
import type { UserSearchResult } from "../../utils/types";

type UserSearchBarProps = {
	searchUsers: (search: string) => Promise<UserSearchResult[]>;
	onResults: (results: UserSearchResult[]) => void;
	onSearchingChange: (isSearching: boolean) => void;
	onHasSearchedChange: (hasSearched: boolean) => void;
	debounceMs?: number;
};

export default function UserSearchBar({ searchUsers, onResults, onSearchingChange, onHasSearchedChange, debounceMs = 700 }: UserSearchBarProps) {
	const [search, setSearch] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const trimmedSearch = search.trim();

		// empty search
		if (!trimmedSearch) {
			onResults([]);
			onSearchingChange(false);
			onHasSearchedChange(false);
			setError(null);
			return;
		}

		// debounce counts as searching
		onSearchingChange(true);
		onHasSearchedChange(false);

		const timeout = window.setTimeout(async () => {
			setError(null);

			try {
				const results = await searchUsers(trimmedSearch);
				onResults(results);
				onHasSearchedChange(true);
			} catch (err) {
				onResults([]);
				onHasSearchedChange(false);
				setError(err instanceof Error ? err.message : "Unable to search for users.");
			} finally {
				onSearchingChange(false);
			}
		}, debounceMs);

		return () => {
			window.clearTimeout(timeout);
		};
	}, [search, searchUsers, onResults, onSearchingChange, debounceMs]);

	function clearSearch() {
		setSearch("");
		setError(null);

		onResults([]);
		onSearchingChange(false);
		onHasSearchedChange(false);
	}

	return (
		<div className="shrink-0 border-b border-stone-200 bg-brand-card p-3">
			<div className="relative">
				<input
					type="text"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search users..."
					autoFocus
					className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-3 pr-10 text-sm text-brand-text outline-none transition placeholder:text-brand-muted/70 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
				/>

				{search && (
					<button
						type="button"
						onClick={clearSearch}
						aria-label="Clear search"
						className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-xl leading-none text-brand-muted transition hover:bg-brand-surface hover:text-brand-red"
					>
						×
					</button>
				)}
			</div>

			{error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
		</div>
	);
}
