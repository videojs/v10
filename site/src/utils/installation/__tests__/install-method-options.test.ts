import { describe, expect, it } from 'vitest';
import { buildOptions } from '../install-method-options';

describe('buildOptions', () => {
  it('lists CDN first when available', () => {
    expect(buildOptions({ includeCdn: true })).toEqual([
      { value: 'cdn', label: 'CDN' },
      { value: 'npm', label: 'npm' },
      { value: 'pnpm', label: 'pnpm' },
      { value: 'yarn', label: 'yarn' },
      { value: 'bun', label: 'bun' },
    ]);
  });

  it('omits CDN when unavailable', () => {
    expect(buildOptions({ includeCdn: false })).toEqual([
      { value: 'npm', label: 'npm' },
      { value: 'pnpm', label: 'pnpm' },
      { value: 'yarn', label: 'yarn' },
      { value: 'bun', label: 'bun' },
    ]);
  });
});
