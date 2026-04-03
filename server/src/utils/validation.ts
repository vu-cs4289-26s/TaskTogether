export function requireString(value: unknown, maxLength?: number): string | null {
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }
    const trimmed = value.trim();
    if (maxLength && trimmed.length > maxLength) {
        return null;
    }
    return trimmed;
}

export function isOneOf<T extends string>(value: unknown, validValues: readonly T[]): value is T {
    return typeof value === 'string' && validValues.includes(value as T);
}
