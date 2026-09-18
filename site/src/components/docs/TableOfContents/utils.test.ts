import { navigate } from 'astro:transitions/client';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { calculateActiveHeadingOffset, calculateRailGeometry, navigateToHeading } from './utils';

vi.mock('astro:transitions/client', () => ({ navigate: vi.fn() }));

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('navigateToHeading', () => {
  it('uses Astro navigation so the router owns the history entry', () => {
    const heading = document.createElement('h2');

    heading.id = 'installation';
    document.body.append(heading);

    navigateToHeading('installation');

    expect(navigate).toHaveBeenCalledWith('#installation');
  });

  it('does not navigate when the heading is absent', () => {
    navigateToHeading('missing');

    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('calculateActiveHeadingOffset', () => {
  it('combines document scroll padding with the heading scroll margin', () => {
    expect(calculateActiveHeadingOffset('96px', '20px')).toBe(116);
  });

  it('uses the available offset when the other value is not numeric', () => {
    expect(calculateActiveHeadingOffset('auto', '20px')).toBe(20);
  });

  it('falls back when neither offset is available', () => {
    expect(calculateActiveHeadingOffset('auto', '')).toBe(125);
  });
});

describe('calculateRailGeometry', () => {
  it('uses the default stripe height and gap when the rail fits', () => {
    expect(calculateRailGeometry(10, 100)).toEqual({ stripeHeight: 1, gap: 4 });
  });

  it('compresses gaps before changing stripe height', () => {
    expect(calculateRailGeometry(10, 28)).toEqual({ stripeHeight: 1, gap: 2 });
  });

  it('compresses stripe height when removing gaps is not enough', () => {
    expect(calculateRailGeometry(10, 5)).toEqual({ stripeHeight: 0.5, gap: 0 });
  });

  it('keeps the default geometry for a single stripe', () => {
    expect(calculateRailGeometry(1, 1)).toEqual({ stripeHeight: 1, gap: 4 });
  });
});
