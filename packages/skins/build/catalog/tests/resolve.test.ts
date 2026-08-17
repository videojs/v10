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
      { name: 'airplay-button', dependencies: ['button-tooltip'] },
      {
        name: 'buffering-indicator',
        dependencies: [],
      },
      {
        name: 'button-tooltip',
        dependencies: [],
      },
      { name: 'captions-button', dependencies: ['button-tooltip'] },
      { name: 'cast-button', dependencies: ['button-tooltip'] },
      { name: 'container', dependencies: [] },
      {
        name: 'default-video',
        scopeClass: 'media-skin-video',
        theme: 'default',
        dependencies: [
          'airplay-button',
          'buffering-indicator',
          'captions-button',
          'cast-button',
          'container',
          'error-dialog',
          'fullscreen-button',
          'overlay',
          'pip-button',
          'play-button',
          'poster',
          'seek-indicator',
          'status-announcer',
          'status-indicator',
          'time-slider',
          'video-gestures',
          'video-hotkeys',
          'video-settings-menu',
          'volume-indicator',
          'volume-popover',
        ],
      },
      { name: 'error-dialog', dependencies: [] },
      { name: 'fullscreen-button', dependencies: ['button-tooltip'] },
      {
        name: 'minimal-video',
        scopeClass: 'media-skin-video-minimal',
        theme: 'minimal',
        dependencies: [
          'airplay-button',
          'buffering-indicator',
          'captions-button',
          'cast-button',
          'container',
          'error-dialog',
          'fullscreen-button',
          'overlay',
          'pip-button',
          'play-button',
          'poster',
          'seek-indicator',
          'status-announcer',
          'status-indicator',
          'time-slider',
          'video-gestures',
          'video-hotkeys',
          'video-settings-menu',
          'volume-indicator',
          'volume-popover',
        ],
      },
      { name: 'mute-button', dependencies: [] },
      { name: 'overlay', dependencies: [] },
      { name: 'pip-button', dependencies: ['button-tooltip'] },
      { name: 'play-button', dependencies: ['button-tooltip'] },
      { name: 'poster', dependencies: [] },
      { name: 'seek-button', dependencies: ['button-tooltip'] },
      { name: 'seek-indicator', dependencies: [] },
      { name: 'status-announcer', dependencies: [] },
      { name: 'status-indicator', dependencies: [] },
      { name: 'time-slider', dependencies: [] },
      { name: 'video-gestures', dependencies: [] },
      { name: 'video-hotkeys', dependencies: [] },
      { name: 'video-settings-menu', dependencies: [] },
      { name: 'volume-indicator', dependencies: [] },
      { name: 'volume-popover', dependencies: ['mute-button', 'volume-slider'] },
      { name: 'volume-slider', dependencies: [] },
    ]);

    const closure = resolveSkinClosure(resolved, 'default-video');
    expect(closure.items.map((item) => item.name)).toEqual([
      'button-tooltip',
      'airplay-button',
      'buffering-indicator',
      'captions-button',
      'cast-button',
      'container',
      'error-dialog',
      'fullscreen-button',
      'overlay',
      'pip-button',
      'play-button',
      'poster',
      'seek-indicator',
      'status-announcer',
      'status-indicator',
      'time-slider',
      'video-gestures',
      'video-hotkeys',
      'video-settings-menu',
      'volume-indicator',
      'mute-button',
      'volume-slider',
      'volume-popover',
      'default-video',
    ]);
    expect(closure.styleFiles).toEqual([
      './styles/components/buffering.styles.ts',
      './styles/components/button.styles.ts',
      './styles/components/container.styles.ts',
      './styles/components/error-dialog.styles.ts',
      './styles/components/menu.styles.ts',
      './styles/components/overlay.styles.ts',
      './styles/components/popup.styles.ts',
      './styles/components/poster.styles.ts',
      './styles/components/seek-indicator.styles.ts',
      './styles/components/slider.styles.ts',
      './styles/components/status-announcer.styles.ts',
      './styles/components/status-indicator-overlay.styles.ts',
      './styles/components/status-indicator.styles.ts',
      './styles/components/volume-indicator.styles.ts',
      './styles/skins/default-video.styles.ts',
    ]);
    expect(closure.sourceFiles).toHaveLength(34);
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
