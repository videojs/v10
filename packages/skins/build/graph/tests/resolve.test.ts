import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { skinManifest } from '../../../canonical/manifest';
import { canonicalRoot, loadSkinManifest } from '../load';
import { resolveSkinClosure, resolveSkinManifest } from '../resolve';
import type { SkinManifest } from '../types';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('resolveSkinManifest', () => {
  it('infers the canonical Skin manifest and complete default-video closure', async () => {
    const resolved = await loadSkinManifest();
    expect(resolved.items).toMatchObject([
      { name: 'button-tooltip', dependencies: { items: [], packages: ['@videojs/core', '@videojs/jsx'] } },
      {
        name: 'default-video',
        dependencies: {
          items: ['fullscreen-button', 'play-button', 'seek-button', 'time-slider', 'volume-popover'],
          packages: ['@videojs/core'],
        },
      },
      { name: 'fullscreen-button', dependencies: { items: ['button-tooltip'] } },
      { name: 'mute-button', dependencies: { items: [] } },
      { name: 'play-button', dependencies: { items: ['button-tooltip'] } },
      { name: 'seek-button', dependencies: { items: ['button-tooltip'] } },
      { name: 'time-slider', dependencies: { items: [] } },
      { name: 'volume-popover', dependencies: { items: ['mute-button', 'volume-slider'] } },
      { name: 'volume-slider', dependencies: { items: [] } },
    ]);

    expect(resolveSkinClosure(resolved, 'default-video')).toMatchObject({
      itemNames: [
        'button-tooltip',
        'fullscreen-button',
        'play-button',
        'seek-button',
        'time-slider',
        'mute-button',
        'volume-slider',
        'volume-popover',
        'default-video',
      ],
      items: [
        'button-tooltip',
        'fullscreen-button',
        'play-button',
        'seek-button',
        'time-slider',
        'mute-button',
        'volume-slider',
        'volume-popover',
      ],
      packages: ['@videojs/core', '@videojs/icons', '@videojs/jsx'],
    });
  });

  it('reports invalid Skin definitions, missing imports, and dependency cycles', async () => {
    const root = setup({
      'a.tsx': `import { B } from './b'; import './missing'; export const A = B;`,
      'b.tsx': `import { A } from './a'; export const B = A;`,
    });
    const definition = {
      resources: {},
      dependencyModules: {},
      skins: [],
      components: [
        { name: 'a', type: 'component', source: './a.tsx', title: 'A', description: 'A.' },
        { name: 'b', type: 'component', source: './b.tsx', title: 'B', description: 'B.' },
      ],
    } as const satisfies SkinManifest;

    const result = await resolveSkinManifest(definition, { rootDir: root });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'skin-dependency-cycle',
      'skin-import-missing',
    ]);
  });

  it('keeps the Skin manifest rooted in the skins package', async () => {
    const result = await resolveSkinManifest(skinManifest, { rootDir: canonicalRoot });
    expect(result.diagnostics).toEqual([]);
  });
});

function setup(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-skins-skin-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return root;
}
