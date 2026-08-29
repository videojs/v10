import { build } from 'vite-plus/pack';
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import type { ShadcnRegistry } from 'vjsc/shadcn';

import { shadcnPackConfig } from '../../shadcn/vite.config';

const registryRoots = ['r/react', 'r/react/css', 'r/html', 'r/html/css'] as const;
const skinNames = [
  'audio',
  'audio-minimal',
  'live-audio',
  'live-audio-minimal',
  'live-video',
  'live-video-minimal',
  'video',
  'video-minimal',
] as const;
let buildOutput: Awaited<ReturnType<typeof build>>[number];
let builtAssets: Map<string, string>;

describe('Skins Shadcn registry', () => {
  beforeAll(async () => {
    const [output] = await build({
      ...shadcnPackConfig,
      logLevel: 'silent',
      write: false,
    });
    if (!output) throw new Error('Expected one registry build output.');

    buildOutput = output;

    builtAssets = new Map(
      buildOutput.chunks
        .filter((item) => item.type === 'asset')
        .map((item) => [item.fileName, String(item.source)] as const)
    );
  }, 120_000);

  it('emits four static source registries without runtime artifacts', async () => {
    expect(buildOutput.chunks.some((item) => item.type === 'chunk')).toBe(false);
    const assets = builtAssets;

    expect([...assets.keys()].every((filename) => filename.startsWith('r/'))).toBe(true);

    for (const root of registryRoots) {
      const registry = assetJson<ShadcnRegistry>(assets, `${root}/registry.json`);

      expect(registry.include?.length).toBeGreaterThan(0);

      for (const item of registryItems(assets, root, registry)) {
        expect(item).not.toHaveProperty('$vjsc');

        if (root.startsWith('r/react')) expect(item.dependencies ?? []).not.toContain('vjsc');

        for (const dependency of item.dependencies ?? []) {
          if (dependency.startsWith('@videojs/')) expect(dependency).toMatch(/@10\.0\.0-beta\.32$/);
        }
      }
    }

    expect([...assets.keys()]).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/(?:^|\/)tailwind\.css$/), expect.stringMatching(/\.js$/)])
    );
  }, 120_000);

  it('keeps public React UI stable across themes and styling modes', async () => {
    const assets = builtAssets;
    const tailwind = catalogItems(assets, 'r/react');
    const css = catalogItems(assets, 'r/react/css');
    const tailwindPublic = publicItems(tailwind);
    const cssPublic = publicItems(css);

    expect(tailwindPublic.map((item) => item.name).sort()).toEqual(cssPublic.map((item) => item.name).sort());
    expect(
      tailwindPublic
        .filter((item) => item.meta?.role === 'skin')
        .map((item) => item.name)
        .sort()
    ).toEqual([...skinNames]);
    expect(tailwindPublic.some((item) => item.name === 'button-tooltip')).toBe(false);
    expect(tailwindPublic.some((item) => /(?:-css|-default)$/.test(item.name))).toBe(false);
    expect(tailwindPublic.some((item) => item.meta?.role === 'media' || item.meta?.role === 'player')).toBe(false);
    expect(tailwindPublic.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        'audio-track-menu',
        'captions-menu',
        'captions-submenu',
        'playback-rate-submenu',
        'quality-menu',
        'radio-item',
        'settings-menu',
      ])
    );

    const playButton = registryItem(tailwind, 'play-button');
    const playSource = registrySource(assets, 'r/react/ui', playButton, '/play-button.tsx');
    const minimalVideo = registryItem(tailwind, 'video-minimal');

    expect(playButton.files.map((file) => file.target)).toEqual(['components/videojs/ui/play-button.tsx']);
    expect(playButton.registryDependencies).toEqual([
      '@videojs/_button-tooltip',
      '@videojs/_resolve-class-name',
      '@videojs/_style-theme',
      '@videojs/button',
    ]);
    expect(playSource).toContain(`@/components/videojs/lib/resolve-class-name`);
    expect(playSource).toContain(`from '@/components/videojs/ui/button-tooltip'`);
    expect(playSource).toContain('@videojs/react/icons/minimal');
    expect(playSource).toContain('export type PlayButtonProps =');
    expect(playSource).not.toContain('interface PlayButtonProps extends');
    expect(minimalVideo.files.some((file) => file.target === 'components/videojs/skins/video/minimal/skin.tsx')).toBe(
      true
    );
    expect(minimalVideo.registryDependencies).toContain('@videojs/play-button');
    expect(
      (minimalVideo.registryDependencies ?? []).some((dependency) => dependency.includes('play-button-minimal'))
    ).toBe(false);

    const cssPlayButton = registryItem(css, 'play-button');
    const cssPlaySource = registrySource(assets, 'r/react/css/ui', cssPlayButton, '/play-button.tsx');
    const cssButtonStyles = registrySource(
      assets,
      'r/react/css/support',
      registryItem(css, '_style-button'),
      '/button.css'
    );

    expect(cssPlaySource).toContain(`import '../styles/button.css';`);
    expect(cssPlaySource).toContain(`import '../styles/theme.css';`);
    expect(cssPlaySource).not.toContain('virtual:vjsc/css');
    expect(cssButtonStyles).toContain('@scope (.media-skin)');
    expect(cssButtonStyles).toContain('.media-play-button');

    const helper = registryItem(tailwind, '_resolve-class-name');
    const helperSource = registrySource(assets, 'r/react/support', helper, '/resolve-class-name.ts');

    expect(helper.files[0]?.target).toBe('components/videojs/lib/resolve-class-name.ts');
    expect(helper.dependencies).toBeUndefined();
    expect(helperSource).toContain(`export { cn } from '@/lib/utils';`);
  }, 120_000);

  it('publishes only complete skin blocks for HTML', async () => {
    const assets = builtAssets;

    for (const root of ['r/html', 'r/html/css'] as const) {
      const items = catalogItems(assets, root);
      const published = publicItems(items);

      expect(published.map((item) => item.name).sort()).toEqual([...skinNames]);
      expect(published.every((item) => item.type === 'registry:block' && item.meta?.role === 'skin')).toBe(true);
      expect(published.some((item) => item.meta?.role === 'component')).toBe(false);
      expect(
        published.flatMap((item) => item.files).some((file) => /(?:^|\/)(?:players|media)\//.test(file.target ?? ''))
      ).toBe(false);
    }
  }, 120_000);
});

type BuiltItem = Omit<ShadcnRegistry['items'][number], 'files'> & {
  files: Array<{ type: string; path: string; target?: string | undefined }>;
  meta?: Record<string, unknown> | undefined;
};

function catalogItems(assets: ReadonlyMap<string, string>, root: string): BuiltItem[] {
  return registryItems(assets, root, assetJson<ShadcnRegistry>(assets, `${root}/registry.json`));
}

function assetJson<Value>(assets: ReadonlyMap<string, string>, fileName: string): Value {
  const source = assets.get(fileName);
  if (!source) throw new Error(`Missing registry asset: ${fileName}`);

  return JSON.parse(source) as Value;
}

function registryItems(assets: ReadonlyMap<string, string>, root: string, registry: ShadcnRegistry): BuiltItem[] {
  return (registry.include ?? []).flatMap((path) => {
    const filename = `${root}/${path.replace(/^\.\//, '')}`;

    return assetJson<{ items: BuiltItem[] }>(assets, filename).items;
  });
}

function publicItems(items: readonly BuiltItem[]): BuiltItem[] {
  return items.filter((item) => item.meta?.public === true);
}

function registryItem(items: readonly BuiltItem[], name: string): BuiltItem {
  const item = items.find((candidate) => candidate.name === name);
  if (!item) throw new Error(`Missing registry item: ${name}`);

  return item;
}

function registrySource(assets: ReadonlyMap<string, string>, group: string, item: BuiltItem, target: string): string {
  const file = item.files.find((candidate) => candidate.target?.endsWith(target));
  if (!file) throw new Error(`Missing registry file: ${item.name}${target}`);

  const source = assets.get(`${group}/${file.path}`);
  if (!source) throw new Error(`Missing registry source: ${group}/${file.path}`);

  return source;
}
