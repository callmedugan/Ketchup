import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
	title: string;
	onClose: () => void;
	children: ReactNode;
	className?: string;
};

export default function Modal({ title, onClose, children, className = "" }: ModalProps) {
	const titleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		dialogRef.current?.focus();

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-3 py-3 backdrop-blur-[2px] sm:px-4 sm:py-4"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				className={`relative flex max-h-[calc(100dvh-1.5rem)] w-[92%] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl outline-none sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-md ${className}`}
			>
				<div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5 sm:py-4">
					<h2 id={titleId} className="min-w-0 truncate text-lg font-bold text-ink sm:text-xl">
						{title}
					</h2>

					<button type="button" onClick={onClose} aria-label="Close" className="modal-close-btn">
						×
					</button>
				</div>

				{children}
			</div>
		</div>
	);
}
