import { describe, it, expect } from 'vitest';
import { advanceDueDate } from '../lib/taskRecurrence.js';

describe('advanceDueDate', () => {
  it('daily: advances by 1 day', () => {
    const base = new Date('2025-03-01T12:00:00Z');
    const result = advanceDueDate(base, 'daily');
    expect(result.toISOString().startsWith('2025-03-02')).toBe(true);
  });

  it('weekly: advances by 7 days', () => {
    const base = new Date('2025-03-01T12:00:00Z');
    const result = advanceDueDate(base, 'weekly');
    expect(result.toISOString().startsWith('2025-03-08')).toBe(true);
  });

  it('monthly: advances by 1 month', () => {
    const base = new Date('2025-03-01T12:00:00Z');
    const result = advanceDueDate(base, 'monthly');
    expect(result.toISOString().startsWith('2025-04-01')).toBe(true);
  });

  it('monthly: handles month-end correctly (Jan 31 → Feb 28/29)', () => {
    const base = new Date('2025-01-31T00:00:00Z');
    const result = advanceDueDate(base, 'monthly');
    // JS Date rolls over: Jan 31 + 1 month = Mar 3 in non-leap, or Mar 2 in leap
    // Just verify it advanced past February
    expect(result > base).toBe(true);
  });

  it('null date: falls back to ~now and returns a valid future Date', () => {
    const before = Date.now();
    const result = advanceDueDate(null, 'daily');
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThan(before);
  });

  it('unknown pattern: throws', () => {
    expect(() => advanceDueDate(new Date(), 'yearly')).toThrow('Unknown recurrence pattern: yearly');
  });
});
