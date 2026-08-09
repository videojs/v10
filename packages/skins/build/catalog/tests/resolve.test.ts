import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { skinCatalog } from '../../../canonical/catalog';
import { canonicalRoot, loadSkinCatalog } from '../load';
import { resolveSkinCatalog, resolveSkinClosure } from '../resolve';
import type { SkinCatalog } from '../types';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('resolveSkinCatalog', () => {
  it('infers the canonical Skin catalog and complete default-video closure', async () => {
    const resolved = await loadSkinCatalog();
    expect(resolved.items).toMatchObject([
      {
        name: 'button-tooltip',
        dependencies: { itemNames: [], packages: ['@videojs/core', '@videojs/jsx'] },
      },
      {
        name: 'default-video',
        dependencies: {
          itemNames: ['fullscreen-button', 'play-button', 'seek-button', 'time-slider', 'volume-popover'],
          packages: ['@videojs/core'],
        },
      },
      { name: 'fullscreen-button', dependencies: { itemNames: ['button-tooltip'] } },
      { name: 'mute-button', dependencies: { itemNames: [] } },
      { name: 'play-button', dependencies: { itemNames: ['button-tooltip'] } },
      { name: 'seek-button', dependencies: { itemNames: ['button-tooltip'] } },
      { name: 'time-slider', dependencies: { itemNames: [] } },
      { name: 'volume-popover', dependencies: { itemNames: ['mute-button', 'volume-slider'] } },
      { name: 'volume-slider', dependencies: { itemNames: [] } },
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
      packages: ['@videojs/core', '@videojs/icons', '@videojs/jsx'],
    });
  });

  it('reports invalid Skin definitions, missing imports, and dependency cycles', async () => {
    const root = setup({
      'a.tsx': `import { B } from './b'; import './missing'; export const A = B;`,
      'b.tsx': `import { A } from './a'; export const B = A;`,
    });
    const definition = {
      resources: {
        styles: {
          tailwind: './styles/tailwind.css',
          base: './styles/base.css',
          themes: { default: './styles/themes/default.css' },
        },
      },
      dependencyModules: {},
      skins: [],
      components: [
        { name: 'a', type: 'component', source: './a.tsx', title: 'A', description: 'A.' },
        { name: 'b', type: 'component', source: './b.tsx', title: 'B', description: 'B.' },
      ],
    } as const satisfies SkinCatalog;

    const result = await resolveSkinCatalog(definition, { rootDir: root });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'skin-dependency-cycle',
      'skin-import-missing',
    ]);
  });

  it('keeps the Skin catalog rooted in the skins package', async () => {
    const result = await resolveSkinCatalog(skinCatalog, { rootDir: canonicalRoot });
    expect(result.diagnostics).toEqual([]);
  });

  it('requires component sources to be registered independently of the catalog directory name', async () => {
    const root = setup({
      'components/unregistered.tsx': 'export const Unregistered = null;',
      'entry.tsx': `import { Unregistered } from './components/unregistered'; export const Entry = Unregistered;`,
    });
    const result = await resolveSkinCatalog(
      {
        resources: {
          styles: {
            tailwind: './styles/tailwind.css',
            base: './styles/base.css',
            themes: { default: './styles/themes/default.css' },
          },
        },
        dependencyModules: {},
        skins: [],
        components: [
          {
            name: 'entry',
            type: 'component',
            source: './entry.tsx',
            title: 'Entry',
            description: 'Entry.',
          },
        ],
      },
      { rootDir: root }
    );

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['skin-entry-unregistered']);
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
