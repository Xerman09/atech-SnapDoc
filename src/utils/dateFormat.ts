/**
 * Centralized human-readable date formatting utilities.
 * UI components must NEVER render raw ISO-8601 strings or Unix timestamps directly.
 */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toValidDate(input: Date | number | string): Date | null {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime12h(date: Date): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}

/**
 * Formats a date as "Nov 15, 2026".
 */
export function formatShortDate(input: Date | number | string): string {
  const date = toValidDate(input);
  if (!date) return 'Unknown date';
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Formats a date and time as "Nov 15, 2026 • 8:25 AM".
 */
export function formatDisplayDate(input: Date | number | string): string {
  const date = toValidDate(input);
  if (!date) return 'Unknown date';
  return `${formatShortDate(date)} • ${formatTime12h(date)}`;
}

/**
 * Formats recent dates relative to today ("Today, 8:25 AM", "Yesterday, 4:10 PM",
 * or falls back to "Nov 15, 2026 • 8:25 AM").
 */
export function formatRelativeDate(
  input: Date | number | string,
  now: Date = new Date()
): string {
  const date = toValidDate(input);
  if (!date) return 'Unknown date';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

  if (dayDiff === 0) {
    return `Today, ${formatTime12h(date)}`;
  }
  if (dayDiff === 1) {
    return `Yesterday, ${formatTime12h(date)}`;
  }
  return formatDisplayDate(date);
}
