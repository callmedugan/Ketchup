import type { ReactNode } from "react";

type ModalProps = {
	title: string;
	onClose: () => void;
	children: ReactNode;
	className?: string;
};

export default function Modal({ title, onClose, children, className = "" }: ModalProps) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-3 py-3 backdrop-blur-[2px] sm:px-4 sm:py-4"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				className={`relative flex max-h-[calc(100dvh-1.5rem)] w-[92%] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-md ${className}`}
			>
				<div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-red-dark bg-brand-red px-4 py-3 sm:px-5 sm:py-4">
					<h2 className="min-w-0 truncate text-lg font-bold text-white sm:text-xl">{title}</h2>

					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full pb-1 text-xl text-white/80 transition hover:bg-white/10 hover:text-white active:scale-90 active:bg-white/15"
					>
						×
					</button>
				</div>

				{children}
			</div>
		</div>
	);
}
