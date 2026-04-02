export default function PriorityPill({
    label,
    selected,
    tone,
    onClick,
    disabled,
}: {
    label: string;
    selected: boolean;
    tone: 'high' | 'medium' | 'low';
    onClick: () => void;
    disabled?: boolean;
}) {
    const base =
        'flex-1 px-4 py-2 rounded-sm border-2 text-center font-medium transition select-none';
    const idle = 'border-divider hover:border-sage';
    const selectedTone =
        tone === 'high'
            ? 'border-urgent bg-urgent/10 text-urgent font-semibold'
            : tone === 'medium'
                ? 'border-pending bg-pending/10 text-pending font-semibold'
                : 'border-success bg-success/10 text-success font-semibold';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${selected ? selectedTone : idle} disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-pressed={selected}
        >
            {label}
        </button>
    );
}
