'use client';

type PasswordRequirementsProps = {
  password: string;
  className?: string;
};

function requirementMet(password: string, requirement: 'length' | 'upperLower' | 'number' | 'special') {
  switch (requirement) {
    case 'length':
      return password.length >= 8;
    case 'upperLower':
      return /[A-Z]/.test(password) && /[a-z]/.test(password);
    case 'number':
      return /[0-9]/.test(password);
    case 'special':
      return /[^A-Za-z0-9]/.test(password);
    default:
      return false;
  }
}

const requirementItems = [
  { key: 'length' as const, label: '8+ characters' },
  { key: 'upperLower' as const, label: 'Include upper and lowercase letters' },
  { key: 'special' as const, label: 'Use at least one special character' },
  { key: 'number' as const, label: 'Include at least one number' },
];

export default function PasswordRequirements({
  password,
  className = '',
}: PasswordRequirementsProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      {requirementItems.map((item) => {
        const met = requirementMet(password, item.key);

        return (
          <div key={item.key} className="flex items-center gap-2 text-sm">
            <span
              className={[
                'flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold transition-colors',
                met
                  ? 'border-success bg-success text-white'
                  : 'border-divider bg-surface text-text-secondary',
              ].join(' ')}
              aria-hidden="true"
            >
              {met ? '✓' : ''}
            </span>
            <span className={met ? 'text-success' : 'text-text-secondary'}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
