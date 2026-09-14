import { addWeeks, isAfter, isBefore, isValid, startOfWeek } from "date-fns";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type InfiniteWeekScrollMobileProps = {
	initialWeek: Date;
	initialDate?: Date;

	minWeek: Date;
	maxWeek: Date;

	chunkSize?: number;

	renderWeek: (weekStart: Date, index: number) => ReactNode;

	stickyHeader?: (firstVisibleDate: Date) => ReactNode;
};

export default function InfiniteWeekScrollMobile({
	initialWeek,
	initialDate = new Date(),
	minWeek,
	maxWeek,
	chunkSize = 3,
	renderWeek,
	stickyHeader,
}: InfiniteWeekScrollMobileProps) {
	// hooks below must run unconditionally regardless of prop validity (rules of hooks) -
	// invalid dates just flow through as harmless no-op values until the guard right before render
	const propsAreValid = isValid(initialWeek) && isValid(initialDate) && isValid(minWeek) && isValid(maxWeek);

	const normalizedInitialWeek = startOfWeek(initialWeek, {
		weekStartsOn: 0,
	});

	const containerRef = useRef<HTMLDivElement>(null);
	const topSentinelRef = useRef<HTMLDivElement>(null);
	const bottomSentinelRef = useRef<HTMLDivElement>(null);

	const loadingPreviousRef = useRef(false);
	const loadingNextRef = useRef(false);

	const previousScrollHeightRef = useRef<number | null>(null);
	const initializedRef = useRef(false);

	const [canScrollUp, setCanScrollUp] = useState(false);
	const [canScrollDown, setCanScrollDown] = useState(true);

	const [firstVisibleDate, setFirstVisibleDate] = useState(initialDate);

	const [weeks, setWeeks] = useState<Date[]>(() => {
		const result: Date[] = [];

		for (let offset = -chunkSize; offset <= chunkSize; offset++) {
			const week = addWeeks(normalizedInitialWeek, offset);

			if (isBefore(week, minWeek)) continue;
			if (isAfter(week, maxWeek)) continue;

			result.push(week);
		}

		return result;
	});

	/* ========================================================================= */
	//                        scroll indicators
	/* ========================================================================= */

	const updateScrollIndicators = useCallback(() => {
		const container = containerRef.current;

		if (!container) return;

		const scrollTop = container.scrollTop;
		const maxScrollTop = container.scrollHeight - container.clientHeight;

		setCanScrollUp(scrollTop > 2);
		setCanScrollDown(scrollTop < maxScrollTop - 2);
	}, []);

	/* ========================================================================= */
	//                        first visible date
	/* ========================================================================= */

	const updateFirstVisibleDate = useCallback(() => {
		const container = containerRef.current;

		if (!container) return;

		const containerTop = container.getBoundingClientRect().top;

		const dayElements = container.querySelectorAll<HTMLElement>("[data-calendar-day]");

		for (const element of dayElements) {
			const rect = element.getBoundingClientRect();

			/*
			 * First day whose bottom edge is still inside the viewport.
			 */
			if (rect.bottom > containerTop) {
				const timestamp = Number(element.dataset.calendarDay);

				if (Number.isNaN(timestamp)) return;

				const date = new Date(timestamp);

				setFirstVisibleDate((current) => (current.getTime() === date.getTime() ? current : date));

				return;
			}
		}
	}, []);

	/* ========================================================================= */
	//                        scroll
	/* ========================================================================= */

	const handleScroll = useCallback(() => {
		updateScrollIndicators();
		updateFirstVisibleDate();
	}, [updateScrollIndicators, updateFirstVisibleDate]);

	/* ========================================================================= */
	//                        initial position
	/* ========================================================================= */

	useLayoutEffect(() => {
		const container = containerRef.current;

		if (!container || initializedRef.current) return;

		const targetTimestamp = startOfDayTimestamp(initialDate);

		const targetElement = container.querySelector<HTMLElement>(`[data-calendar-day="${targetTimestamp}"]`);

		if (!targetElement) return;

		/*
		 * Put the requested initial date at the top of the scroll viewport.
		 */
		container.scrollTop = targetElement.offsetTop;

		initializedRef.current = true;

		requestAnimationFrame(() => {
			updateScrollIndicators();
			updateFirstVisibleDate();
		});
	}, [initialDate, weeks, updateScrollIndicators, updateFirstVisibleDate]);

	/* ========================================================================= */
	//                        preserve scroll
	/* ========================================================================= */

	useLayoutEffect(() => {
		const container = containerRef.current;
		const previousScrollHeight = previousScrollHeightRef.current;

		if (!container || previousScrollHeight === null) {
			requestAnimationFrame(() => {
				updateScrollIndicators();
				updateFirstVisibleDate();
			});

			return;
		}

		const addedHeight = container.scrollHeight - previousScrollHeight;

		container.scrollTop += addedHeight;

		previousScrollHeightRef.current = null;
		loadingPreviousRef.current = false;

		requestAnimationFrame(() => {
			updateScrollIndicators();
			updateFirstVisibleDate();
		});
	}, [weeks, updateScrollIndicators, updateFirstVisibleDate]);

	/* ========================================================================= */
	//                        previous
	/* ========================================================================= */

	const loadPrevious = useCallback(() => {
		if (loadingPreviousRef.current) return;

		const container = containerRef.current;
		const firstWeek = weeks[0];

		if (!container || !firstWeek || !isAfter(firstWeek, minWeek)) {
			return;
		}

		const previousWeeks: Date[] = [];

		for (let i = 1; i <= chunkSize; i++) {
			const week = addWeeks(firstWeek, -i);

			if (isBefore(week, minWeek)) break;

			previousWeeks.unshift(week);
		}

		if (previousWeeks.length === 0) return;

		loadingPreviousRef.current = true;

		previousScrollHeightRef.current = container.scrollHeight;

		setWeeks((current) => [...previousWeeks, ...current]);
	}, [chunkSize, minWeek, weeks]);

	/* ========================================================================= */
	//                        next
	/* ========================================================================= */

	const loadNext = useCallback(() => {
		if (loadingNextRef.current) return;

		const lastWeek = weeks[weeks.length - 1];

		if (!lastWeek || !isBefore(lastWeek, maxWeek)) {
			return;
		}

		const nextWeeks: Date[] = [];

		for (let i = 1; i <= chunkSize; i++) {
			const week = addWeeks(lastWeek, i);

			if (isAfter(week, maxWeek)) break;

			nextWeeks.push(week);
		}

		if (nextWeeks.length === 0) return;

		loadingNextRef.current = true;

		setWeeks((current) => [...current, ...nextWeeks]);

		loadingNextRef.current = false;
	}, [chunkSize, maxWeek, weeks]);

	/* ========================================================================= */
	//                        observers
	/* ========================================================================= */

	useEffect(() => {
		const container = containerRef.current;
		const topSentinel = topSentinelRef.current;
		const bottomSentinel = bottomSentinelRef.current;

		if (!container || !topSentinel || !bottomSentinel) {
			return;
		}

		const options: IntersectionObserverInit = {
			root: container,
			rootMargin: "300px 0px",
			threshold: 0,
		};

		const topObserver = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) {
				loadPrevious();
			}
		}, options);

		const bottomObserver = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) {
				loadNext();
			}
		}, options);

		topObserver.observe(topSentinel);
		bottomObserver.observe(bottomSentinel);

		return () => {
			topObserver.disconnect();
			bottomObserver.disconnect();
		};
	}, [loadNext, loadPrevious]);

	/* ========================================================================= */
	//                        page
	/* ========================================================================= */

	if (!propsAreValid) {
		console.error("Invalid InfiniteWeekScrollMobile dates:", { initialWeek, initialDate, minWeek, maxWeek });
		return null;
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			{/* Month header */}
			{stickyHeader && <div className="shrink-0 px-3 pt-3">{stickyHeader(firstVisibleDate)}</div>}

			{/* Scroll section */}
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

					<div className="flex flex-col px-3 py-3">
						{weeks.map((week, index) => (
							<div key={week.toISOString()}>{renderWeek(week, index)}</div>
						))}
					</div>

					<div ref={bottomSentinelRef} className="h-px" />
				</div>

				{/* Top fade */}
				{canScrollUp && (
					<div
						className="
						pointer-events-none
						absolute inset-x-0 top-0 z-20
						h-10
						bg-linear-to-b
						from-brand-page/90
						to-transparent
					"
					>
						<div className="flex justify-center pt-1">
							<span className="text-xs font-bold text-brand-muted/60">⌃</span>
						</div>
					</div>
				)}

				{/* Bottom fade */}
				{canScrollDown && (
					<div
						className="
						pointer-events-none
						absolute inset-x-0 bottom-0 z-20
						h-10
						bg-linear-to-t
						from-brand-page/90
						to-transparent
					"
					>
						<div className="flex h-full items-end justify-center pb-1">
							<span className="text-xs font-bold text-brand-muted/60">⌄</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

/* ========================================================================= */
//                        helpers
/* ========================================================================= */

function startOfDayTimestamp(date: Date) {
	const copy = new Date(date);

	copy.setHours(0, 0, 0, 0);

	return copy.getTime();
}
