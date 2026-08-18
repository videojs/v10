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
        dependencies: [],
      },
      { name: 'container', dependencies: [] },
      {
        name: 'default-video',
        scopeClass: 'media-skin-video',
        theme: 'default',
        dependencies: [
          'container',
          'fullscreen-button',
          'overlay',
          'play-button',
          'poster',
          'seek-button',
          'time-slider',
          'volume-popover',
        ],
      },
      { name: 'fullscreen-button', dependencies: ['button-tooltip'] },
      { name: 'mute-button', dependencies: [] },
      { name: 'overlay', dependencies: [] },
      { name: 'play-button', dependencies: ['button-tooltip'] },
      { name: 'poster', dependencies: [] },
      { name: 'seek-button', dependencies: ['button-tooltip'] },
      { name: 'time-slider', dependencies: [] },
      { name: 'volume-popover', dependencies: ['mute-button', 'volume-slider'] },
      { name: 'volume-slider', dependencies: [] },
    ]);

    const closure = resolveSkinClosure(resolved, 'default-video');
    expect(closure.items.map((item) => item.name)).toEqual([
      'container',
      'button-tooltip',
      'fullscreen-button',
      'overlay',
      'play-button',
      'poster',
      'seek-button',
      'time-slider',
      'mute-button',
      'volume-slider',
      'volume-popover',
      'default-video',
    ]);
    expect(closure.styleFiles).toEqual([
      './styles/components/button.tailwind.ts',
      './styles/components/container.tailwind.ts',
      './styles/components/overlay.tailwind.ts',
      './styles/components/popup.tailwind.ts',
      './styles/components/poster.tailwind.ts',
      './styles/components/slider.tailwind.ts',
      './styles/skins/default-video.tailwind.ts',
    ]);
    expect(closure.sourceFiles).toHaveLength(12);
    expect(closure.sourceFiles).toContain('./skins/default-video/skin.tsx');
  });

  it('rejects missing imports', async () => {
    const root = setup({
      'entry.tsx': `import './missing'; export const Entry = null;`,
    });
    await expect(
      resolveSkinCatalog(
        {
          resources: resources(),
          dependencyModules: {},
          skins: [],
          components: [component('entry', './entry.tsx')],
        },
        { rootDir: root }
      )
    ).rejects.toThrow('cannot resolve `./missing`');
  });

  it('rejects dependency cycles', async () => {
    const root = setup({
      'a.tsx': `import { B } from './b'; export const A = B;`,
      'b.tsx': `import { A } from './a'; export const B = A;`,
    });
    await expect(
      resolveSkinCatalog(
        {
          resources: resources(),
          dependencyModules: {},
          skins: [],
          components: [component('a', './a.tsx'), component('b', './b.tsx')],
        },
        { rootDir: root }
      )
    ).rejects.toThrow('Skin dependency cycle: a -> b -> a.');
  });

  it('keeps the Skin catalog rooted in the skins package', async () => {
    await expect(resolveSkinCatalog(skinCatalog, { rootDir: canonicalRoot })).resolves.toBeDefined();
  });

  it('keeps unregistered local modules private while resolving dependencies through them', async () => {
    const root = setup({
      'components/private-helper.tsx': `import { Dependency } from '../dependency'; import { Controls } from '@videojs/core/components'; export const PrivateHelper = Dependency ?? Controls;`,
      'helpers/index.ts': `export { PrivateHelper } from '../components/private-helper';`,
      'dependency.tsx': `export const Dependency = null;`,
      'entry.tsx': `import { PrivateHelper } from './helpers'; export const Entry = PrivateHelper;`,
    });
    const resolved = await resolveSkinCatalog(
      {
        resources: resources(),
        dependencyModules: { '@videojs/core/components': 'components' },
        skins: [],
        components: [component('entry', './entry.tsx'), component('dependency', './dependency.tsx')],
      },
      { rootDir: root }
    );

    expect(resolved.items.find((item) => item.name === 'entry')).toMatchObject({
      dependencies: ['dependency'],
      sourceFiles: ['./components/private-helper.tsx', './entry.tsx', './helpers/index.ts'],
      symbols: { components: ['Controls'], icons: [] },
    });
    expect(resolveSkinClosure(resolved, 'entry').sourceFiles).toEqual([
      './components/private-helper.tsx',
      './dependency.tsx',
      './entry.tsx',
      './helpers/index.ts',
    ]);
  });
});

function resources(): SkinCatalog['resources'] {
  return {
    styles: {
      tailwind: './styles/tailwind.css',
      base: './styles/base.css',
      themes: { default: './styles/themes/default.css' },
    },
  };
}

function component(name: string, source: string): SkinCatalog['components'][number] {
  return { name, type: 'component', source, title: name, description: `${name}.` };
}

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
