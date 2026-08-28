import type { ReactNode } from "react";

type ModalContainerProps = { children: ReactNode; onClose: () => void; className?: string };

export default function ModalContainer({ children, onClose, className = "" }: ModalContainerProps) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-3 py-3 backdrop-blur-[2px] sm:px-4 sm:py-4"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className={`relative flex max-h-[calc(100dvh-1.5rem)] w-[92%] max-w-sm flex-col overflow-hidden rounded-2xl border border-stone-200 bg-brand-card shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-md ${className}`}
			>
				{children}
			</div>
		</div>
	);
}
