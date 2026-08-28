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
    const items = registryItems(assets, registry);
    const playButton = registryItem(items, 'react-play-button');
    const minimalPlayButton = registryItem(items, 'react-play-button-minimal');
    const button = registryItem(items, 'react-button');
    const minimalButton = registryItem(items, 'react-button-minimal');
    const defaultVideo = registryItem(items, 'react-video-skin');
    const minimalVideo = registryItem(items, 'react-video-skin-minimal');
    const defaultAudio = registryItem(items, 'react-audio-skin');
    const audioPlayButton = registryItem(items, 'react-audio-play-button');
    const defaultVideoCss = registryItem(items, 'react-video-skin-css');
    const htmlVideo = registryItem(items, 'html-video-skin');
    const htmlMinimalVideoCss = registryItem(items, 'html-video-skin-minimal-css');
    const container = registryItem(items, 'react-container');
    const poster = registryItem(items, 'react-poster');
    const videoSettingsMenu = registryItem(items, 'react-video-settings-menu');
    const videoHotkeys = registryItem(items, 'react-video-hotkeys');
    const volumePopover = registryItem(items, 'react-volume-popover');
    const styles = registryItem(items, 'tailwind-styles');
    const utils = registryItem(items, 'react-utils');
    const reactLiveVideoPlayer = registryItem(items, 'react-live-video-minimal-css');
    const htmlAudioPlayer = registryItem(items, 'html-audio');
    const reactHlsJsVideo = registryItem(items, 'react-hlsjs-video');
    const htmlMuxSpf = registryItem(items, 'html-mux-video-spf');

    const playSource = registrySource(assets, 'react/components', playButton, '/play-button.tsx');
    const buttonSource = registrySource(assets, 'react/components', button, '/button.tsx');
    const minimalButtonSource = registrySource(assets, 'react/components', minimalButton, '/button-minimal.tsx');
    const posterSource = registrySource(assets, 'react/components', poster, '/poster.tsx');
    const qualityMenuSource = registrySource(assets, 'react/components', videoSettingsMenu, '/quality-menu.tsx');
    const videoSettingsMenuSource = registrySource(
      assets,
      'react/components',
      videoSettingsMenu,
      '/video-settings-menu.tsx'
    );
    const settingsMenuSource = registrySource(assets, 'react/components', videoSettingsMenu, '/settings-menu.tsx');
    const volumePopoverSource = registrySource(assets, 'react/components', volumePopover, '/volume-popover.tsx');

    expect(items).toHaveLength(166);
    expect(new Set(items.map((item) => item.name)).size).toBe(items.length);
    expect(items.every((item) => item.meta?.role && typeof item.meta.public === 'boolean')).toBe(true);
    expect(items.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        'react-video-skin-minimal',
        'react-play-button',
        'react-play-button-minimal',
        'react-playback-hotkeys',
      ])
    );
    expect(items.some((item) => item.name === 'react-button-tooltip')).toBe(false);
    expect(playSource).toContain('export interface PlayButtonProps');
    expect(playSource).toContain('<PlayButtonPrimitive render={<Button />} className=');
    expect(buttonSource).toContain('export type ButtonProps');
    expect(buttonSource).toContain('grid min-h-0');
    expect(playSource).toContain(`from "@/components/videojs/utils"`);
    expect(playSource).not.toContain('const meta');
    expect(playSource).not.toContain('jsx-runtime');
    expect(playButton.dependencies).toEqual(['@videojs/react@10.0.0-beta.32', 'react']);
    expect(playButton.registryDependencies).toEqual([
      '@videojs/react-button',
      '@videojs/react-utils',
      '@videojs/tailwind-styles',
    ]);
    expect(minimalPlayButton.registryDependencies).toEqual([
      '@videojs/react-button-minimal',
      '@videojs/react-utils',
      '@videojs/tailwind-styles',
    ]);
    expect(buttonSource).toContain('size-9');
    expect(minimalButtonSource).toContain('size-9.5');
    expect(defaultVideo.registryDependencies).toEqual(
      expect.arrayContaining(['@videojs/react-container', '@videojs/react-play-button', '@videojs/react-poster'])
    );
    expect(defaultVideo.registryDependencies).not.toContain('@videojs/react-seek-button');
    expect(minimalVideo.registryDependencies).toContain('@videojs/react-play-button-minimal');
    expect(minimalVideo.registryDependencies).not.toContain('@videojs/react-play-button');
    expect(defaultAudio.registryDependencies).toContain('@videojs/react-audio-play-button');
    expect(audioPlayButton.registryDependencies).toContain('@videojs/react-play-button');
    expect(defaultVideoCss.registryDependencies).not.toContain('@videojs/tailwind-styles');
    expect(htmlVideo.registryDependencies).toContain('@videojs/tailwind-styles');
    expect(htmlMinimalVideoCss.registryDependencies).not.toContain('@videojs/tailwind-styles');
    const defaultVideoCssSource = registrySource(assets, 'react/skins', defaultVideoCss, '/skin.tsx');
    const defaultVideoCssPlaySource = registrySource(
      assets,
      'react/skins',
      defaultVideoCss,
      '/buttons/play-button.tsx'
    );
    const defaultVideoStyles = registrySource(assets, 'react/skins', defaultVideoCss, '/skin.css');

    expect(defaultVideoCssSource).toContain(`import './skin.css';`);
    expect(defaultVideoCssSource).not.toContain('virtual:vjsc/css');
    expect(defaultVideoCssPlaySource).toContain('media-play-button');
    expect(defaultVideoStyles).toContain('.media-button {');
    expect(defaultVideoStyles).toContain('@layer videojs.base');
    expect(videoHotkeys.registryDependencies).toContain('@videojs/react-playback-hotkeys');
    expect(items.some((item) => item.name === 'react-playback-hotkeys-minimal')).toBe(false);
    expect(container.dependencies).toEqual(['@videojs/react@10.0.0-beta.32', 'react']);
    expect(container.registryDependencies).toEqual(['@videojs/react-utils', '@videojs/tailwind-styles']);
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
      'components/videojs/styles/themes/default.css',
      'components/videojs/styles/themes/minimal.css',
      'components/videojs/styles/themes/preferences.css',
      'components/videojs/styles/themes/shared.css',
    ]);
    expect(utils).toMatchObject({
      type: 'registry:lib',
      dependencies: ['clsx', 'tailwind-merge'],
    });
    expect(utils.files[0]).toMatchObject({
      type: 'registry:lib',
      target: 'components/videojs/utils.ts',
    });
    expect(registrySource(assets, 'shared', utils, '/utils.ts')).toContain('export function resolveClassName');
    expect(reactLiveVideoPlayer.registryDependencies).toEqual(['@videojs/react-live-video-skin-minimal-css']);
    expect(
      registrySource(assets, 'react/players', reactLiveVideoPlayer, '/players/live-video-minimal-css.tsx')
    ).toContain('interface LiveVideoProps extends LiveVideoPlayerProps');
    expect(htmlAudioPlayer.registryDependencies).toEqual(['@videojs/html-audio-skin']);
    expect(registrySource(assets, 'html/players', htmlAudioPlayer, '/players/audio.html')).toContain('<audio-player>');
    expect(registrySource(assets, 'react/media', reactHlsJsVideo, '/media/hlsjs-video.ts')).toContain(
      `from '@videojs/react/media/hlsjs-video'`
    );
    expect(registrySource(assets, 'html/media', htmlMuxSpf, '/media/mux-video-spf.ts')).toContain(
      `from '@videojs/html/media/mux-video/spf'`
    );
  }, 30_000);
});

type BuiltItem = Omit<ShadcnRegistry['items'][number], 'files'> & {
  files: Array<{ type: string; path: string; target?: string | undefined }>;
};

function assetJson<Value>(assets: ReadonlyMap<string, string>, fileName: string): Value {
  const source = assets.get(fileName);
  if (!source) throw new Error(`Missing registry asset: ${fileName}`);

  return JSON.parse(source) as Value;
}

function registryItems(assets: ReadonlyMap<string, string>, registry: ShadcnRegistry): BuiltItem[] {
  return (registry.include ?? []).flatMap(
    (path) => assetJson<{ items: BuiltItem[] }>(assets, path.replace(/^\.\//, '')).items
  );
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
