import { useEffect, useRef, useState, type ReactNode, type UIEvent } from "react";

type ScrollDirection = "vertical" | "horizontal";

type ScrollableContainerProps = { children: ReactNode; className?: string; direction?: ScrollDirection };

export default function ScrollableContainer({ children, className = "", direction = "vertical" }: ScrollableContainerProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const [canScrollBack, setCanScrollBack] = useState(false);
	const [canScrollForward, setCanScrollForward] = useState(false);

	function updateScrollState(element: HTMLDivElement) {
		if (direction === "vertical") {
			setCanScrollBack(element.scrollTop > 0);

			setCanScrollForward(element.scrollTop + element.clientHeight < element.scrollHeight - 1);
		} else {
			setCanScrollBack(element.scrollLeft > 0);

			setCanScrollForward(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
		}
	}

	function handleScroll(event: UIEvent<HTMLDivElement>) {
		updateScrollState(event.currentTarget);
	}

	useEffect(() => {
		if (scrollRef.current) {
			updateScrollState(scrollRef.current);
		}
	}, [children, direction]);

	const isVertical = direction === "vertical";

	return (
		<div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
			{/* Back fade */}
			{canScrollBack &&
				(isVertical ? (
					<div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex h-10 items-start justify-center bg-linear-to-b from-brand-surface to-transparent pt-1">
						<svg
							viewBox="0 0 32 8"
							className="h-2 w-8 text-stone-400"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M2 6 L16 2 L30 6" />
						</svg>
					</div>
				) : (
					<div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 flex w-10 items-center justify-start bg-linear-to-r from-brand-surface to-transparent pl-1">
						<svg
							viewBox="0 0 8 32"
							className="h-8 w-2 text-stone-400"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M6 2 L2 16 L6 30" />
						</svg>
					</div>
				))}

			{/* Scroll area */}
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className={`
					h-full w-full
					scrollbar-none
					[&::-webkit-scrollbar]:hidden
					${isVertical ? "overflow-y-auto overflow-x-hidden pb-5" : "overflow-x-auto overflow-y-hidden pr-5"}
					${className}
				`}
			>
				{children}
			</div>

			{/* Forward fade */}
			{canScrollForward &&
				(isVertical ? (
					<div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex h-10 items-end justify-center bg-linear-to-t from-brand-surface to-transparent pb-1">
						<svg
							viewBox="0 0 32 8"
							className="h-2 w-8 text-stone-400"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M2 2 L16 6 L30 2" />
						</svg>
					</div>
				) : (
					<div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 flex w-10 items-center justify-end bg-linear-to-l from-brand-surface to-transparent pr-1">
						<svg
							viewBox="0 0 8 32"
							className="h-8 w-2 text-stone-400"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M2 2 L6 16 L2 30" />
						</svg>
					</div>
				))}
		</div>
	);
}
