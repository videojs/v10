import { describe, expect, it } from 'vitest';

import { clamp, roundToStep } from '../number';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns min when min equals max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it('handles negative ranges', () => {
    expect(clamp(0, -10, -5)).toBe(-5);
    expect(clamp(-20, -10, -5)).toBe(-10);
  });
});

describe('roundToStep', () => {
  it('rounds to nearest step from min', () => {
    expect(roundToStep(7, 5, 0)).toBe(5);
    expect(roundToStep(8, 5, 0)).toBe(10);
  });

  it('respects min offset', () => {
    expect(roundToStep(4, 5, 2)).toBe(2);
    expect(roundToStep(6, 5, 2)).toBe(7);
  });

  it('handles decimal steps', () => {
    expect(roundToStep(0.35, 0.1, 0)).toBe(0.3);
    expect(roundToStep(0.36, 0.1, 0)).toBe(0.4);
    expect(roundToStep(0.14, 0.1, 0)).toBe(0.1);
  });

  it('returns min when value equals min', () => {
    expect(roundToStep(0, 1, 0)).toBe(0);
    expect(roundToStep(5, 10, 5)).toBe(5);
  });
});
