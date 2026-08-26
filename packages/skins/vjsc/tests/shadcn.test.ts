import { build } from 'vite-plus/pack';
import { describe, expect, it } from 'vite-plus/test';
import type { ShadcnRegistry } from 'vjsc/shadcn';

import { shadcnPackConfig } from '../../shadcn/vite.config';

describe('Skins Shadcn registry', () => {
  it('emits editable React and Tailwind JSON without a synthetic runtime chunk', async () => {
    const [result] = await build({
      ...shadcnPackConfig,
      logLevel: 'silent',
      write: false,
    });
    if (!result) throw new Error('Expected one registry build output.');

    const output = result.chunks;

    expect(output.some((item) => item.type === 'chunk')).toBe(false);
    const assets = new Map<string, string>(
      output.filter((item) => item.type === 'asset').map((item) => [item.fileName, String(item.source)] as const)
    );
    const registry = assetJson<ShadcnRegistry>(assets, 'registry.json');
    const playButton = assetJson<BuiltItem>(assets, 'play-button.json');
    const minimalPlayButton = assetJson<BuiltItem>(assets, 'play-button-minimal.json');
    const defaultVideo = assetJson<BuiltItem>(assets, 'default-video.json');
    const minimalVideo = assetJson<BuiltItem>(assets, 'minimal-video.json');
    const container = assetJson<BuiltItem>(assets, 'container.json');
    const poster = assetJson<BuiltItem>(assets, 'poster.json');
    const videoSettingsMenu = assetJson<BuiltItem>(assets, 'video-settings-menu.json');
    const volumePopover = assetJson<BuiltItem>(assets, 'volume-popover.json');
    const styles = assetJson<BuiltItem>(assets, 'styles.json');
    const utils = assetJson<BuiltItem>(assets, 'utils.json');

    const playSource = playButton.files.find((file) => file.target?.endsWith('/play-button.tsx'))?.content;
    const posterSource = poster.files.find((file) => file.target?.endsWith('/poster.tsx'))?.content;
    const qualityMenuSource = videoSettingsMenu.files.find((file) =>
      file.target?.endsWith('/quality-menu.tsx')
    )?.content;
    const videoSettingsMenuSource = videoSettingsMenu.files.find((file) =>
      file.target?.endsWith('/video-settings-menu.tsx')
    )?.content;
    const volumePopoverSource = volumePopover.files.find((file) =>
      file.target?.endsWith('/volume-popover.tsx')
    )?.content;

    expect(registry.items).toHaveLength(50);
    expect(registry.items.map((item: { name: string }) => item.name)).toEqual(
      expect.arrayContaining(['button-tooltip', 'minimal-video', 'play-button', 'play-button-minimal'])
    );
    expect(playSource).toContain('export interface PlayButtonProps');
    expect(playSource).toContain('<PlayButtonPrimitive className=');
    expect(playSource).toContain('grid min-h-0');
    expect(playSource).toContain(`from "@/components/videojs/utils"`);
    expect(playSource).not.toContain('const meta');
    expect(playSource).not.toContain('jsx-runtime');
    expect(playButton.dependencies).toEqual(['@videojs/react', 'react']);
    expect(playButton.registryDependencies).toEqual(['@videojs/button-tooltip', '@videojs/styles', '@videojs/utils']);
    expect(minimalPlayButton.registryDependencies).toEqual([
      '@videojs/button-tooltip-minimal',
      '@videojs/styles',
      '@videojs/utils',
    ]);
    expect(playSource).toContain('size-9');
    expect(minimalPlayButton.files[0]?.content).toContain('size-9.5');
    expect(defaultVideo.registryDependencies).toEqual(
      expect.arrayContaining(['@videojs/container', '@videojs/play-button', '@videojs/poster'])
    );
    expect(defaultVideo.registryDependencies).not.toContain('@videojs/seek-button');
    expect(minimalVideo.registryDependencies).toContain('@videojs/play-button-minimal');
    expect(minimalVideo.registryDependencies).not.toContain('@videojs/play-button');
    expect(container.dependencies).toEqual(['@videojs/react', 'react']);
    expect(container.registryDependencies).toEqual(['@videojs/styles', '@videojs/utils']);
    expect(posterSource).toContain('<PosterPrimitive render={children}');
    expect(posterSource).not.toContain('@videojs/core/vjsc');
    expect(qualityMenuSource).toContain('useQualityOptions');
    expect(qualityMenuSource).toContain(`quality?.selectedLabel`);
    expect(qualityMenuSource).toContain('available &&');
    expect(videoSettingsMenuSource).toContain('const hasSettings =');
    expect(videoSettingsMenuSource).toContain('hasSettings &&');
    expect(volumePopoverSource).toContain('VolumePopoverPrimitive.Root');
    expect(volumePopoverSource).toContain('VolumePopoverPrimitive.Trigger');
    expect(volumePopoverSource).not.toContain('usePlayer');
    expect(styles.files.map((file) => file.target)).toEqual([
      'components/videojs/styles/base.css',
      'components/videojs/styles/captions.css',
      'components/videojs/styles/tailwind.css',
      'components/videojs/styles/tailwind.shared.css',
      'components/videojs/styles/themes/default.css',
      'components/videojs/styles/themes/minimal.css',
      'components/videojs/styles/themes/video.css',
    ]);
    expect(utils).toMatchObject({
      type: 'registry:lib',
      dependencies: ['clsx', 'tailwind-merge'],
    });
    expect(utils.files[0]).toMatchObject({
      type: 'registry:lib',
      target: 'components/videojs/utils.ts',
    });
    expect(utils.files[0]?.content).toContain('export function resolveClassName');
  }, 30_000);
});

type BuiltItem = Omit<ShadcnRegistry['items'][number], 'files'> & {
  files: Array<{ type: string; path: string; target?: string | undefined; content: string }>;
};

function assetJson<Value>(assets: ReadonlyMap<string, string>, fileName: string): Value {
  const source = assets.get(fileName);
  if (!source) throw new Error(`Missing registry asset: ${fileName}`);

  return JSON.parse(source) as Value;
}
