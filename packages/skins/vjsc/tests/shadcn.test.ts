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
    const button = assetJson<BuiltItem>(assets, 'button.json');
    const minimalButton = assetJson<BuiltItem>(assets, 'button-minimal.json');
    const defaultVideo = assetJson<BuiltItem>(assets, 'default-video.json');
    const minimalVideo = assetJson<BuiltItem>(assets, 'minimal-video.json');
    const container = assetJson<BuiltItem>(assets, 'container.json');
    const poster = assetJson<BuiltItem>(assets, 'poster.json');
    const volumePopover = assetJson<BuiltItem>(assets, 'volume-popover.json');
    const styles = assetJson<BuiltItem>(assets, 'styles.json');
    const utils = assetJson<BuiltItem>(assets, 'utils.json');

    const playSource = playButton.files.find((file) => file.target?.endsWith('/play-button.tsx'))?.content;
    const buttonSource = button.files.find((file) => file.target?.endsWith('/button.tsx'))?.content;
    const posterSource = poster.files.find((file) => file.target?.endsWith('/poster.tsx'))?.content;
    const qualityMenuSource = defaultVideo.files.find((file) => file.target?.endsWith('/quality-menu.tsx'))?.content;
    const videoSettingsMenuSource = defaultVideo.files.find((file) =>
      file.target?.endsWith('/skins/video/settings-menu.tsx')
    )?.content;
    const settingsMenuSource = defaultVideo.files.find((file) => file.target?.endsWith('/settings-menu.tsx'))?.content;
    const volumePopoverSource = volumePopover.files.find((file) =>
      file.target?.endsWith('/volume-popover.tsx')
    )?.content;

    expect(registry.items).toHaveLength(50);
    expect(registry.items.map((item: { name: string }) => item.name)).toEqual(
      expect.arrayContaining(['button-tooltip', 'minimal-video', 'play-button', 'play-button-minimal'])
    );
    expect(playSource).toContain('export interface PlayButtonProps');
    expect(playSource).toContain('<PlayButtonPrimitive render={<Button />} className=');
    expect(buttonSource).toContain('export type ButtonProps');
    expect(buttonSource).toContain('grid size-media-control min-h-0');
    expect(playSource).toContain(`from "@/components/videojs/utils"`);
    expect(playSource).not.toContain('const meta');
    expect(playSource).not.toContain('jsx-runtime');
    expect(playButton.dependencies).toEqual(['@videojs/react', 'react']);
    expect(playButton.registryDependencies).toEqual([
      '@videojs/button',
      '@videojs/button-tooltip',
      '@videojs/styles',
      '@videojs/utils',
    ]);
    expect(minimalPlayButton.registryDependencies).toEqual([
      '@videojs/button-minimal',
      '@videojs/button-tooltip-minimal',
      '@videojs/styles',
      '@videojs/utils',
    ]);
    expect(buttonSource).toContain('rounded-media-control');
    expect(minimalButton.files[0]?.content).toContain('size-media-control');
    expect(defaultVideo.registryDependencies).toEqual(
      expect.arrayContaining(['@videojs/container', '@videojs/play-button', '@videojs/poster'])
    );
    expect(defaultVideo.registryDependencies).not.toContain('@videojs/seek-button');
    expect(minimalVideo.registryDependencies).toContain('@videojs/play-button-minimal');
    expect(minimalVideo.registryDependencies).not.toContain('@videojs/play-button');
    expect(defaultVideo.files.some((file) => file.target?.endsWith('/playback-hotkeys.tsx'))).toBe(true);
    expect(minimalVideo.files.some((file) => file.target?.endsWith('/playback-hotkeys.tsx'))).toBe(true);
    expect(container.dependencies).toEqual(['@videojs/react', 'react']);
    expect(container.registryDependencies).toEqual(['@videojs/styles', '@videojs/utils']);
    expect(posterSource).toContain('<PosterPrimitive render={children}');
    expect(posterSource).not.toContain('@videojs/core/vjsc');
    expect(qualityMenuSource).not.toContain('useQualityOptions');
    expect(qualityMenuSource).toContain('<QualityRadioGroup.Root>');
    expect(qualityMenuSource).toContain('<QualityRadioGroup.Value');
    expect(qualityMenuSource).toContain('<QualityRadioGroup.Options');
    expect(qualityMenuSource).not.toContain('<Menu.Content keepMounted');
    expect(settingsMenuSource).toMatch(/<Menu\.Popup\s+keepMounted/);
    expect(videoSettingsMenuSource).not.toContain('const hasSettings =');
    expect(volumePopoverSource).toContain('VolumePopoverPrimitive.Root');
    expect(volumePopoverSource).toContain('VolumePopoverPrimitive.Trigger');
    expect(volumePopoverSource).not.toContain('usePlayer');
    expect(styles.files.map((file) => file.target)).toEqual([
      'components/videojs/styles/base.css',
      'components/videojs/styles/captions.css',
      'components/videojs/styles/tailwind.css',
      'components/videojs/styles/tailwind.shared.css',
      'components/videojs/styles/themes/audio.css',
      'components/videojs/styles/themes/minimal.css',
      'components/videojs/styles/themes/preferences.css',
      'components/videojs/styles/themes/theme.css',
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
