type ModalHeaderProps = { title: string; onClose: () => void };

export default function ModalHeader({ title, onClose }: ModalHeaderProps) {
	return (
		<div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-red-dark bg-brand-red px-4 py-3 sm:px-5 sm:py-4">
			<h2 className="min-w-0 truncate text-lg font-bold text-brand-cream sm:text-xl">{title}</h2>

			<button type="button" onClick={onClose} className="modal-close-btn" aria-label="Close">
				×
			</button>
		</div>
	);
}
