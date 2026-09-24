import { describe, expect, it } from 'vite-plus/test';

import { packageOutputGlobs, packageOwnedPaths } from '../outputs.ts';

describe('packageOutputGlobs', () => {
  it('caches exactly the paths the package writers own', () => {
    const owned = [...packageOwnedPaths('html'), ...packageOwnedPaths('react')];
    const globs = packageOutputGlobs().map(({ pattern }) => pattern.replace(/\/\*\*$/, ''));

    expect(globs.sort()).toEqual(owned.sort());
    expect(packageOutputGlobs()).toContainEqual({ pattern: 'packages/react/src/internal/skins/**', base: 'workspace' });
  });
});

describe('packageOwnedPaths', () => {
  it('owns every public React preset module and stylesheet, and the background copies', () => {
    const owned = packageOwnedPaths('react');

    expect(owned).toContain('packages/react/src/presets/live-audio/minimal-skin.css');
    expect(owned).toContain('packages/react/src/presets/video/skin.tsx');
    expect(owned).toContain('packages/react/src/presets/background/skin.tsx');
    expect(packageOwnedPaths('html')).toContain('packages/html/src/define/background/skin.css');
  });
});
