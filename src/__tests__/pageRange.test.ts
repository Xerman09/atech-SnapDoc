import { describe, expect, it } from 'vitest';
import { parsePageRange } from '../utils/pageRange';

describe('parsePageRange', () => {
  it('returns all indices for empty or "All"', () => {
    expect(parsePageRange('', 4)).toEqual([0, 1, 2, 3]);
    expect(parsePageRange('All', 3)).toEqual([0, 1, 2]);
  });

  it('parses ranges and comma-separated page numbers without duplicates', () => {
    expect(parsePageRange('1-3, 5, 2', 6)).toEqual([0, 1, 2, 4]);
    expect(parsePageRange('4-2', 5)).toEqual([3, 2, 1]);
  });

  it('returns empty array when no valid pages match', () => {
    expect(parsePageRange('9-12', 4)).toEqual([]);
    expect(parsePageRange('abc', 4)).toEqual([]);
  });
});
