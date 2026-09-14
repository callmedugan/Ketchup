import { addWeeks, isAfter, isBefore, startOfWeek } from "date-fns";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type InfiniteWeekScrollProps = {
	initialWeek: Date;
	minWeek: Date;
	maxWeek: Date;

	weeksVisible?: number;
	chunkSize?: number;

	renderWeek: (weekStart: Date) => ReactNode;
	onTopWeekChange?: (weekStart: Date) => void;
};

export default function InfiniteWeekScroll({
	initialWeek,
	minWeek,
	maxWeek,
	weeksVisible = 3,
	chunkSize = 3,
	renderWeek,
	onTopWeekChange,
}: InfiniteWeekScrollProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const topSentinelRef = useRef<HTMLDivElement>(null);
	const bottomSentinelRef = useRef<HTMLDivElement>(null);

	const initializedRef = useRef(false);
	const loadingPreviousRef = useRef(false);
	const loadingNextRef = useRef(false);

	const previousScrollHeightRef = useRef<number | null>(null);

	const [weekHeight, setWeekHeight] = useState(0);

	const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
	const [isLoadingNext, setIsLoadingNext] = useState(false);

	const [canScrollUp, setCanScrollUp] = useState(false);
	const [canScrollDown, setCanScrollDown] = useState(true);

	/* ========================================================================= */
	//                        initial weeks
	/* ========================================================================= */

	//#region initial weeks

	const [weeks, setWeeks] = useState<Date[]>(() => {
		const start = startOfWeek(initialWeek, {
			weekStartsOn: 0,
		});

		const result: Date[] = [];

		for (let offset = -chunkSize; offset < weeksVisible + chunkSize; offset++) {
			const week = addWeeks(start, offset);

			if (isBefore(week, minWeek)) continue;
			if (isAfter(week, maxWeek)) continue;

			result.push(week);
		}

		return result;
	});

	//#endregion

	/* ========================================================================= */
	//                        scroll indicators
	/* ========================================================================= */

	//#region scroll indicators

	const updateScrollIndicators = useCallback(() => {
		const container = containerRef.current;

		if (!container) return;

		const scrollTop = container.scrollTop;
		const maxScrollTop = container.scrollHeight - container.clientHeight;

		setCanScrollUp(scrollTop > 2);
		setCanScrollDown(scrollTop < maxScrollTop - 2);
	}, []);

	//#endregion

	/* ========================================================================= */
	//                        week size
	/* ========================================================================= */

	//#region week size

	useEffect(() => {
		const container = containerRef.current;

		if (!container) return;

		const observer = new ResizeObserver(() => {
			const height = container.clientHeight;

			if (height <= 0) return;

			setWeekHeight(height / weeksVisible);
		});

		observer.observe(container);

		return () => observer.disconnect();
	}, [weeksVisible]);

	//#endregion

	/* ========================================================================= */
	//                        active week
	/* ========================================================================= */

	//#region active week

	const handleScroll = useCallback(() => {
		const container = containerRef.current;

		if (!container || weekHeight <= 0) return;

		const index = Math.min(weeks.length - 1, Math.max(0, Math.floor(container.scrollTop / weekHeight)));

		const topWeek = weeks[index];

		if (topWeek) {
			onTopWeekChange?.(topWeek);
		}

		updateScrollIndicators();
	}, [weekHeight, weeks, onTopWeekChange, updateScrollIndicators]);

	//#endregion

	/* ========================================================================= */
	//                        initial scroll position
	/* ========================================================================= */

	//#region initial scroll position

	useLayoutEffect(() => {
		const container = containerRef.current;

		if (!container || weekHeight <= 0 || initializedRef.current) {
			return;
		}

		const initialIndex = weeks.findIndex((week) => week.getTime() === initialWeek.getTime());

		if (initialIndex < 0) return;

		container.scrollTop = initialIndex * weekHeight;

		initializedRef.current = true;

		requestAnimationFrame(() => {
			handleScroll();
		});
	}, [initialWeek, weekHeight, weeks, handleScroll]);

	//#endregion

	/* ========================================================================= */
	//                        preserve position
	/* ========================================================================= */

	//#region preserve position

	useLayoutEffect(() => {
		const container = containerRef.current;
		const previousScrollHeight = previousScrollHeightRef.current;

		if (!container || previousScrollHeight === null) {
			updateScrollIndicators();
			return;
		}

		const newScrollHeight = container.scrollHeight;
		const addedHeight = newScrollHeight - previousScrollHeight;

		/*
		 * Browser scroll anchoring is disabled on the container.
		 * We preserve the user's position manually when older
		 * weeks are inserted above the current viewport.
		 */
		container.scrollTop += addedHeight;

		previousScrollHeightRef.current = null;

		loadingPreviousRef.current = false;
		setIsLoadingPrevious(false);

		updateScrollIndicators();
	}, [weeks, updateScrollIndicators]);

	//#endregion

	/* ========================================================================= */
	//                        load previous
	/* ========================================================================= */

	//#region load previous

	const loadPrevious = useCallback(() => {
		if (loadingPreviousRef.current) return;

		const container = containerRef.current;
		const firstWeek = weeks[0];

		if (!container || !firstWeek || !isAfter(firstWeek, minWeek)) {
			return;
		}

		loadingPreviousRef.current = true;
		setIsLoadingPrevious(true);

		const previousWeeks: Date[] = [];

		for (let i = 1; i <= chunkSize; i++) {
			const week = addWeeks(firstWeek, -i);

			if (isBefore(week, minWeek)) break;

			previousWeeks.unshift(week);
		}

		if (previousWeeks.length === 0) {
			loadingPreviousRef.current = false;
			setIsLoadingPrevious(false);
			return;
		}

		/*
		 * Store the real scroll height before prepending.
		 * After React renders the new weeks, we'll compensate
		 * using the actual height difference.
		 */
		previousScrollHeightRef.current = container.scrollHeight;

		setWeeks((current) => [...previousWeeks, ...current]);
	}, [chunkSize, minWeek, weeks]);

	//#endregion

	/* ========================================================================= */
	//                        load next
	/* ========================================================================= */

	//#region load next

	const loadNext = useCallback(() => {
		if (loadingNextRef.current) return;

		const lastWeek = weeks[weeks.length - 1];

		if (!lastWeek || !isBefore(lastWeek, maxWeek)) {
			return;
		}

		loadingNextRef.current = true;
		setIsLoadingNext(true);

		const nextWeeks: Date[] = [];

		for (let i = 1; i <= chunkSize; i++) {
			const week = addWeeks(lastWeek, i);

			if (isAfter(week, maxWeek)) break;

			nextWeeks.push(week);
		}

		if (nextWeeks.length === 0) {
			loadingNextRef.current = false;
			setIsLoadingNext(false);
			return;
		}

		setWeeks((current) => [...current, ...nextWeeks]);

		loadingNextRef.current = false;
		setIsLoadingNext(false);
	}, [chunkSize, maxWeek, weeks]);

	//#endregion

	/* ========================================================================= */
	//                        observers
	/* ========================================================================= */

	//#region observers

	useEffect(() => {
		const container = containerRef.current;
		const topSentinel = topSentinelRef.current;
		const bottomSentinel = bottomSentinelRef.current;

		if (!container || !topSentinel || !bottomSentinel || weekHeight <= 0) {
			return;
		}

		const observerOptions: IntersectionObserverInit = {
			root: container,

			/*
			 * Start loading roughly one week before the user
			 * actually reaches the end of loaded content.
			 */
			rootMargin: `${weekHeight}px 0px`,
			threshold: 0,
		};

		const topObserver = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) {
				loadPrevious();
			}
		}, observerOptions);

		const bottomObserver = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) {
				loadNext();
			}
		}, observerOptions);

		topObserver.observe(topSentinel);
		bottomObserver.observe(bottomSentinel);

		return () => {
			topObserver.disconnect();
			bottomObserver.disconnect();
		};
	}, [loadNext, loadPrevious, weekHeight]);

	//#endregion

	/* ========================================================================= */
	//                        page
	/* ========================================================================= */

	return (
		<div className="relative min-h-0 flex-1 overflow-hidden">
			{/* Scroll area */}
			<div
				ref={containerRef}
				onScroll={handleScroll}
				className="
					scrollbar-hidden
					h-full overflow-y-auto
					overscroll-contain
					[overflow-anchor:none]
				"
			>
				<div ref={topSentinelRef} className="h-px" />

				{weeks.map((week) => (
					<div
						key={week.toISOString()}
						style={{
							height: weekHeight || undefined,
						}}
						className="shrink-0"
					>
						{renderWeek(week)}
					</div>
				))}

				<div ref={bottomSentinelRef} className="h-px" />
			</div>

			{/* Scroll up indicator */}
			{canScrollUp && (
				<div
					className="
						pointer-events-none
						absolute inset-x-0 top-0 z-20
						h-8
						bg-linear-to-b
						from-canvas/80
						to-transparent
					"
				>
					<div className="flex justify-center pt-1">
						<span className="text-xs font-bold text-ink-muted/60">⌃</span>
					</div>
				</div>
			)}

			{/* Scroll down indicator */}
			{canScrollDown && (
				<div
					className="
						pointer-events-none
						absolute inset-x-0 bottom-0 z-20
						h-8
						bg-linear-to-t
						from-canvas/80
						to-transparent
					"
				>
					<div className="flex h-full items-end justify-center pb-1">
						<span className="text-xs font-bold text-ink-muted/60">⌄</span>
					</div>
				</div>
			)}

			{/* Loading previous */}
			{isLoadingPrevious && (
				<div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2">
					<div className="rounded-full border border-border bg-surface/95 px-3 py-1 text-[10px] font-bold text-ink-muted shadow-sm">
						Loading earlier weeks...
					</div>
				</div>
			)}

			{/* Loading next */}
			{isLoadingNext && (
				<div className="pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2">
					<div className="rounded-full border border-border bg-surface/95 px-3 py-1 text-[10px] font-bold text-ink-muted shadow-sm">
						Loading later weeks...
					</div>
				</div>
			)}
		</div>
	);
}
