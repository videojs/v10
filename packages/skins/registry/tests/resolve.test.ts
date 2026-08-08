import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { registry } from '../entries';
import { loadRegistry, skinsRoot } from '../load';
import { resolveRegistry, resolveRegistryClosure } from '../resolve';
import type { RegistryDefinition } from '../types';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('resolveRegistry', () => {
  it('infers the canonical Skin registry and complete default-video closure', async () => {
    const resolved = await loadRegistry();
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

    expect(resolveRegistryClosure(resolved, 'default-video')).toMatchObject({
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

  it('reports invalid registry definitions, missing imports, and dependency cycles', async () => {
    const root = setup({
      'a.skin.tsx': `import { B } from './b.skin'; import './missing'; export const A = B;`,
      'b.skin.tsx': `import { A } from './a.skin'; export const B = A;`,
    });
    const definition = {
      resources: {},
      dependencyModules: {},
      items: [
        { name: 'a', type: 'component', source: './a.skin.tsx', internal: true },
        { name: 'b', type: 'component', source: './b.skin.tsx', internal: true },
      ],
    } as const satisfies RegistryDefinition;

    const result = await resolveRegistry(definition, { rootDir: root });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'registry-dependency-cycle',
      'registry-import-missing',
    ]);
  });

  it('keeps the registry definition rooted in the skins package', async () => {
    const result = await resolveRegistry(registry, { rootDir: skinsRoot });
    expect(result.diagnostics).toEqual([]);
  });
});

function setup(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-skins-registry-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return root;
}
