import { describe, expect, it } from 'vitest';
import { canonicalRoot, loadSkinCatalog } from '../../catalog/load';
import { createFrameworkSkin } from '../generate';

describe('createFrameworkSkin', () => {
  it('emits editable React modules and role-based vanilla stylesheets', async () => {
    const output = await createFrameworkSkin(await loadSkinCatalog(), {
      rootDir: canonicalRoot,
      skin: 'default-video',
      projections: [{ framework: 'react' }, { framework: 'html' }],
    });
    const sources = output.sources.filter((candidate) => candidate.framework === 'react');
    const skin = source(output, 'react', 'skin.tsx');
    const buttonTooltip = source(output, 'react', 'components/buttons/button-tooltip.tsx');
    const playButton = source(output, 'react', 'components/buttons/play-button.tsx');
    const seekButton = source(output, 'react', 'components/buttons/seek-button.tsx');
    const volumeSlider = source(output, 'react', 'components/sliders/volume-slider.tsx');

    expect(sources.map((file) => file.fileName)).toEqual([
      'components/buttons/button-tooltip.tsx',
      'components/buttons/fullscreen-button.tsx',
      'components/buttons/mute-button.tsx',
      'components/buttons/play-button.tsx',
      'components/buttons/seek-button.tsx',
      'components/controls/volume-popover.tsx',
      'components/sliders/time-slider.tsx',
      'components/sliders/volume-slider.tsx',
      'skin.tsx',
    ]);
    expect(skin).toContain('from "./components/buttons/play-button"');
    expect(skin).toContain('export function DefaultVideoSkin()');
    expect(buttonTooltip).toContain('export interface ButtonTooltipProps extends TooltipPrimitive.RootProps');
    expect(playButton).toContain('export function PlayButton()');
    expect(seekButton).toContain("import type { SeekButtonProps } from '@videojs/core'");
    expect(seekButton).toContain('export function SeekButton(props: SeekButtonProps = {})');
    expect(volumeSlider).toContain('export function VolumeSlider(props: VolumeSliderProps = {})');
    expect(sources.map((file) => file.source).join('\n')).not.toContain('@ts-nocheck');
    expect(sources.map((file) => file.source).join('\n')).not.toContain('$1');
    expect(output.styles.map((file) => file.fileName)).toEqual([
      'styles/styles.css',
      'styles/preflight.css',
      'styles/base.css',
      'styles/theme.css',
      'styles/buttons.css',
      'styles/controls.css',
      'styles/popups.css',
      'styles/sliders.css',
    ]);
    expect(style(output, 'styles/styles.css')).toContain("@import './buttons.css'");
    expect(style(output, 'styles/buttons.css')).toContain('.media-button {');
    expect(style(output, 'styles/buttons.css').match(/^\.media-button \{/gm)).toHaveLength(1);
    expect(style(output, 'styles/buttons.css')).not.toContain('.media-play-button {');
    expect(output.styles.map((file) => file.source).join('\n')).not.toContain('--tw-');
    expect(style(output, 'styles/preflight.css')).toContain('@scope (.media-skin)');
  });

  it('bundles HTML registrations and markup into one Skin module', async () => {
    const output = await createFrameworkSkin(await loadSkinCatalog(), {
      rootDir: canonicalRoot,
      skin: 'default-video',
      projections: [{ framework: 'html' }],
    });
    const html = source(output, 'html', 'skin.ts');

    expect(html).toContain("import '@videojs/html/icons/element'");
    expect(html).toContain('export const skin = /* html */ `<media-controls');
    expect(html).toContain('<media-play-button class="media-button media-play-button" commandfor="play-tooltip">');
    expect(html).toContain('<media-tooltip side="top" class="media-surface media-tooltip" id="play-tooltip">');
    expect(html).toContain('commandfor="seek-backward-tooltip"');
    expect(html).toContain('commandfor="seek-forward-tooltip"');
    expect(html).toContain('commandfor="volume-popover"');
    expect(html).toContain('commandfor="fullscreen-tooltip"');
    expect(html).toContain('<media-time-slider class="media-slider">');
    expect(html).toContain('<media-volume-slider class="media-slider" thumb-alignment="edge" orientation="vertical">');
    expect(html).toContain('<media-time class="media-time" type="remaining" toggle>');
    expect(html).toContain('open-on-hover');
    expect(html).toContain('delay="200"');
    expect(html).toContain('close-delay="100"');
    expect(style(output, 'styles/buttons.css')).toContain('.media-button {');
    expect(style(output, 'styles/buttons.css').match(/^\.media-button \{/gm)).toHaveLength(1);
    expect(output.styles.map((file) => file.source).join('\n')).not.toContain('--tw-');
  });
});

function style(output: Awaited<ReturnType<typeof createFrameworkSkin>>, fileName: string): string {
  const file = output.styles.find((candidate) => candidate.fileName === fileName);
  if (!file) throw new Error(`Missing generated style file \`${fileName}\`.`);
  return file.source;
}

function source(
  output: Awaited<ReturnType<typeof createFrameworkSkin>>,
  framework: 'html' | 'react',
  fileName: string
): string {
  const file = output.sources.find((candidate) => candidate.framework === framework && candidate.fileName === fileName);
  if (!file) throw new Error(`Missing generated ${framework} source file \`${fileName}\`.`);
  return file.source;
}
