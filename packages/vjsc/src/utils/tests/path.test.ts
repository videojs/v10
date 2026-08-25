import { resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { absolutePath, fileStem } from '../path';

describe('path utilities', () => {
  it('resolves relative paths and preserves absolute paths', () => {
    const cwd = resolve('/workspace');
    const absolute = resolve('/source/component.tsx');

    expect(absolutePath(cwd, 'component.tsx')).toBe(resolve(cwd, 'component.tsx'));
    expect(absolutePath(cwd, absolute)).toBe(absolute);
  });

  it('returns the filename without its final extension', () => {
    expect(fileStem('/source/play-button.tsx')).toBe('play-button');
    expect(fileStem('/source/play-button.test.tsx')).toBe('play-button.test');
  });
});
