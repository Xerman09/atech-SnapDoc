import { describe, expect, it } from 'vitest';
import {
  formatDisplayDate,
  formatRelativeDate,
  formatShortDate,
} from '../utils/dateFormat';

describe('dateFormat utilities', () => {
  it('formats short dates in human-readable form', () => {
    const sample = new Date(2026, 10, 15, 8, 25, 0); // Nov 15, 2026
    expect(formatShortDate(sample)).toBe('Nov 15, 2026');
  });

  it('formats display dates with 12-hour clock and never raw ISO', () => {
    const sample = new Date(2026, 10, 15, 16, 5, 0);
    const out = formatDisplayDate(sample);
    expect(out).toBe('Nov 15, 2026 • 4:05 PM');
    expect(out).not.toContain('T');
    expect(out).not.toContain('Z');
  });

  it('formats relative dates for today and yesterday', () => {
    const now = new Date(2026, 10, 15, 14, 0, 0);
    const today = new Date(2026, 10, 15, 8, 25, 0);
    const yesterday = new Date(2026, 10, 14, 20, 10, 0);

    expect(formatRelativeDate(today, now)).toBe('Today, 8:25 AM');
    expect(formatRelativeDate(yesterday, now)).toBe('Yesterday, 8:10 PM');
  });

  it('returns fallback string for invalid dates', () => {
    expect(formatShortDate('not-a-date')).toBe('Unknown date');
    expect(formatDisplayDate(Number.NaN)).toBe('Unknown date');
  });
});
