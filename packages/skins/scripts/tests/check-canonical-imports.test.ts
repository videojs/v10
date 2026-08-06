import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { checkCanonicalImports } from '../check-canonical-imports';

const roots: string[] = [];

function setup(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-canonical-imports-'));
  roots.push(root);

  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }

  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('checkCanonicalImports', () => {
  it('accepts stable Video.js exports and local imports', () => {
    const root = setup({
      'components/control.tsx': `
        import type { SeekButtonProps } from '@videojs/core';
        import { Controls } from '@videojs/core/components';
        import type { ComponentNode } from '@videojs/jsx';
        import { PlayIcon } from '@videojs/icons/components';
        export { helper } from './helper';
        export type Props = SeekButtonProps;
        export const value: ComponentNode | typeof Controls | typeof PlayIcon = Controls;
      `,
      'components/helper.ts': 'export const helper = true;',
    });

    expect(checkCanonicalImports(root).violations).toEqual([]);
  });

  it('rejects private and target-specific package imports', () => {
    const root = setup({
      'component.tsx': `
        import { PlayButton } from '@videojs/core/src/core/ui/play-button';
        import { useState } from 'react';
        export const load = () => import('@videojs/react/ui/play-button');
        export type Internal = import('@videojs/core/src/core/ui/manifest').ComponentManifest;
        export const value = [PlayButton, useState, load];
      `,
    });

    expect(checkCanonicalImports(root).violations.map(({ source, reason }) => ({ source, reason }))).toEqual([
      { source: '@videojs/core/src/core/ui/play-button', reason: 'package-not-allowed' },
      { source: 'react', reason: 'package-not-allowed' },
      { source: '@videojs/react/ui/play-button', reason: 'package-not-allowed' },
      { source: '@videojs/core/src/core/ui/manifest', reason: 'package-not-allowed' },
    ]);
  });

  it('rejects relative imports that escape the canonical root', () => {
    const root = setup({
      'components/control.tsx': `import { legacy } from '../../src/default/tailwind/video.tailwind';`,
    });

    expect(checkCanonicalImports(root).violations).toMatchObject([
      {
        source: '../../src/default/tailwind/video.tailwind',
        reason: 'outside-canonical-root',
      },
    ]);
  });
});
