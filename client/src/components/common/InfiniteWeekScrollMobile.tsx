import { addWeeks, isAfter, isBefore, isValid, startOfWeek } from "date-fns";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type InfiniteWeekScrollMobileProps = {
	initialWeek: Date;
	minWeek: Date;
	maxWeek: Date;

	chunkSize?: number;

	renderWeek: (weekStart: Date) => ReactNode;
};

export default function InfiniteWeekScrollMobile({ initialWeek, minWeek, maxWeek, chunkSize = 3, renderWeek }: InfiniteWeekScrollMobileProps) {
	if (!isValid(initialWeek) || !isValid(minWeek) || !isValid(maxWeek)) {
		console.error("Invalid InfiniteWeekScrollMobile dates:", {
			initialWeek,
			minWeek,
			maxWeek,
		});

		return null;
	}

	const normalizedInitialWeek = startOfWeek(initialWeek, {
		weekStartsOn: 0,
	});

	const containerRef = useRef<HTMLDivElement>(null);
	const topSentinelRef = useRef<HTMLDivElement>(null);
	const bottomSentinelRef = useRef<HTMLDivElement>(null);

	const initialWeekRef = useRef<HTMLDivElement>(null);

	const loadingPreviousRef = useRef(false);
	const loadingNextRef = useRef(false);

	const previousScrollHeightRef = useRef<number | null>(null);

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
	//                        initial position
	/* ========================================================================= */

	useLayoutEffect(() => {
		const container = containerRef.current;
		const initialElement = initialWeekRef.current;

		if (!container || !initialElement) return;

		container.scrollTop = initialElement.offsetTop;
	}, []);

	/* ========================================================================= */
	//                        preserve scroll
	/* ========================================================================= */

	useLayoutEffect(() => {
		const container = containerRef.current;
		const previousScrollHeight = previousScrollHeightRef.current;

		if (!container || previousScrollHeight === null) {
			return;
		}

		const addedHeight = container.scrollHeight - previousScrollHeight;

		container.scrollTop += addedHeight;

		previousScrollHeightRef.current = null;
		loadingPreviousRef.current = false;
	}, [weeks]);

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

	return (
		<div
			ref={containerRef}
			className="
				scrollbar-hidden
				h-full overflow-y-auto
				overscroll-contain
				[overflow-anchor:none]
			"
		>
			<div ref={topSentinelRef} className="h-px" />

			<div className="flex flex-col px-3 py-3">
				{weeks.map((week) => {
					const isInitial = week.getTime() === normalizedInitialWeek.getTime();

					return (
						<div key={week.toISOString()} ref={isInitial ? initialWeekRef : undefined}>
							{renderWeek(week)}
						</div>
					);
				})}
			</div>

			<div ref={bottomSentinelRef} className="h-px" />
		</div>
	);
}
