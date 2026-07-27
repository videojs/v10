import { describe, expect, it } from 'vitest';
import { calculateRailGeometry } from './utils';

describe('calculateRailGeometry', () => {
  it('uses the default stripe height and gap when the rail fits', () => {
    expect(calculateRailGeometry(10, 100)).toEqual({ stripeHeight: 2, gap: 4 });
  });

  it('compresses gaps before changing stripe height', () => {
    expect(calculateRailGeometry(10, 38)).toEqual({ stripeHeight: 2, gap: 2 });
  });

  it('compresses stripe height when removing gaps is not enough', () => {
    expect(calculateRailGeometry(10, 15)).toEqual({ stripeHeight: 1.5, gap: 0 });
  });

  it('keeps the default geometry for a single stripe', () => {
    expect(calculateRailGeometry(1, 1)).toEqual({ stripeHeight: 2, gap: 4 });
  });
});
