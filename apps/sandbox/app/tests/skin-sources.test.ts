import { describe, expect, it } from 'vitest';

import { defaultSkinSource, skinSourceAvailable, skinStylings, tailwindSkinAvailable } from '../shared/skin-sources';

describe('skinStylings', () => {
  it('publishes CSS from the packages and both stylings from the authored sources', () => {
    expect(skinStylings('html', 'package')).toEqual(['css']);
    expect(skinStylings('react', 'package')).toEqual(['css']);
    expect(skinStylings('html', 'authored')).toEqual(['css', 'tailwind']);
    expect(skinStylings('react', 'authored')).toEqual(['css', 'tailwind']);
  });

  it('publishes Tailwind from the registry for React only', () => {
    expect(skinStylings('react', 'registry')).toEqual(['css', 'tailwind']);
    expect(skinStylings('html', 'registry')).toEqual(['css']);
  });

  it('leaves the CDN page with the packages', () => {
    for (const source of ['package', 'registry', 'authored'] as const) {
      expect(skinStylings('cdn', source)).toEqual(['css']);
    }

    expect(skinSourceAvailable('package', 'cdn')).toBe(true);
    expect(skinSourceAvailable('registry', 'cdn')).toBe(false);
  });
});

describe('defaultSkinSource', () => {
  it('keeps CSS on the packages and sends Tailwind where it is published', () => {
    expect(defaultSkinSource('html', 'css')).toBe('package');
    expect(defaultSkinSource('react', 'css')).toBe('package');
    expect(defaultSkinSource('react', 'tailwind')).toBe('registry');
    expect(defaultSkinSource('html', 'tailwind')).toBe('authored');
  });
});

describe('tailwindSkinAvailable', () => {
  it('offers Tailwind on React through the registry and never on the CDN page', () => {
    expect(tailwindSkinAvailable('react')).toBe(true);
    expect(tailwindSkinAvailable('cdn')).toBe(false);
    // On html it depends on the workspace, which the test config declares.
    expect(tailwindSkinAvailable('html')).toBe(skinSourceAvailable('authored', 'html'));
  });
});
