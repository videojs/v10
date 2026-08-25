import { resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { moduleFilename, moduleId, normalizeModuleId, normalizeResolvedId, parseModuleId } from '../module-id';
import { escapesRoot, isInsideRoot, toPosixPath } from '../path';

describe('module ID utilities', () => {
  it('builds and parses stable query-bearing IDs', () => {
    const id = moduleId('/source/component.tsx', { skin: 'minimal', framework: 'react' });

    expect(id).toBe('/source/component.tsx?framework=react&skin=minimal');
    expect(moduleFilename(id)).toBe('/source/component.tsx');
    expect(Object.fromEntries(parseModuleId(id).parameters)).toEqual({ framework: 'react', skin: 'minimal' });
    expect(normalizeModuleId('/source/component.tsx?skin=minimal&framework=react')).toBe(id);
    expect(normalizeResolvedId('virtual:component?skin=minimal&framework=react')).toBe(
      'virtual:component?skin=minimal&framework=react'
    );
  });

  it('recognizes strict descendants without platform-specific separators', () => {
    const root = resolve('/source');

    expect(isInsideRoot(root, resolve(root, 'components/play-button.tsx'))).toBe(true);
    expect(isInsideRoot(root, root)).toBe(false);
    expect(isInsideRoot(root, resolve(root, '../outside.ts'))).toBe(false);
    expect(escapesRoot('../outside.ts')).toBe(true);
    expect(toPosixPath('components\\buttons\\play.tsx')).toBe('components/buttons/play.tsx');
  });
});
