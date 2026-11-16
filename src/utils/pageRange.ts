/**
 * Parses a human-friendly 1-based page range string (e.g. "1-3, 5")
 * into deduplicated 0-based page indices within [0, totalPages - 1].
 * Empty input or "all" returns all page indices.
 */
export function parsePageRange(input: string, totalPages: number): number[] {
  if (totalPages <= 0) return [];
  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const seen = new Set<number>();
  const result: number[] = [];
  const parts = trimmed.split(',');

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Number(startStr);
      const end = Number(endStr);
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
      const step = start <= end ? 1 : -1;
      for (let p = start; step > 0 ? p <= end : p >= end; p += step) {
        if (p >= 1 && p <= totalPages && !seen.has(p - 1)) {
          seen.add(p - 1);
          result.push(p - 1);
        }
      }
    } else {
      const num = Number(part);
      if (Number.isInteger(num) && num >= 1 && num <= totalPages && !seen.has(num - 1)) {
        seen.add(num - 1);
        result.push(num - 1);
      }
    }
  }

  return result;
}
