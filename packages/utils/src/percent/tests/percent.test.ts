import { describe, expect, it } from 'vitest';

import { formatPercent } from '../percent';

describe('formatPercent', () => {
  it('uses Intl percent style', () => {
    expect(formatPercent(0.75)).toMatch(/75/);
    expect(formatPercent(0.75)).toMatch(/%/);
  });

  it('clamps to 0-100%', () => {
    expect(formatPercent(-1)).toBe(formatPercent(0));
    expect(formatPercent(2)).toBe(formatPercent(1));
  });

  it('handles invalid fraction', () => {
    expect(formatPercent(Number.NaN)).toMatch(/0/);
    expect(formatPercent(Number.NaN)).toMatch(/%/);
  });

  it('falls back when locale is invalid', () => {
    expect(formatPercent(0.75, 'not-a-invalid-bcp47-tag!!!')).toBe('75%');
  });
});
