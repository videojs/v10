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
    const files = output.files.filter((candidate) => candidate.framework === 'react');
    const skin = content(output, 'react', 'skin.tsx');
    const buttonTooltip = content(output, 'react', 'components/buttons/button-tooltip.tsx');
    const playButton = content(output, 'react', 'components/buttons/play-button.tsx');
    const overlay = content(output, 'react', 'components/layout/overlay.tsx');
    const poster = content(output, 'react', 'components/layout/poster.tsx');
    const seekButton = content(output, 'react', 'components/buttons/seek-button.tsx');
    const container = content(output, 'react', 'components/layout/container.tsx');
    const volumeSlider = content(output, 'react', 'components/sliders/volume-slider.tsx');

    expect(files.map((file) => file.fileName)).toEqual([
      'components/buttons/button-tooltip.tsx',
      'components/buttons/fullscreen-button.tsx',
      'components/buttons/mute-button.tsx',
      'components/buttons/play-button.tsx',
      'components/buttons/seek-button.tsx',
      'components/controls/volume-popover.tsx',
      'components/layout/container.tsx',
      'components/layout/overlay.tsx',
      'components/layout/poster.tsx',
      'components/sliders/time-slider.tsx',
      'components/sliders/volume-slider.tsx',
      'skin.tsx',
    ]);
    expect(skin).toContain('from "./components/buttons/play-button"');
    expect(skin).toContain('export interface DefaultVideoSkinProps extends Omit<ContainerProps');
    expect(skin).toContain('<Container {...containerProps}');
    expect(skin).toContain('{children}');
    expect(skin).toContain('poster && <Poster');
    expect(skin).toContain('media-skin media-skin-video media-theme-default');
    expect(skin).not.toContain('className="media-surface');
    expect(buttonTooltip).toContain('export interface ButtonTooltipProps extends TooltipPrimitive.RootProps');
    expect(playButton).toContain('export function PlayButton()');
    expect(seekButton).toContain("import type { SeekButtonProps } from '@videojs/core'");
    expect(seekButton).toContain('export function SeekButton(props: SeekButtonProps = {})');
    expect(volumeSlider).toContain('export function VolumeSlider(props: VolumeSliderProps = {})');
    expect(container).toContain('export function Container');
    expect(container).toContain('ContainerProps');
    expect(container).toContain('<ContainerPrimitive {...props}');
    expect(container).not.toContain('poster');
    expect(container).not.toContain('placeholder');
    expect(poster).toContain('export function Poster');
    expect(poster).toContain('PosterProps');
    expect(poster).toContain('<PosterPrimitive {...props}');
    expect(poster).not.toContain('<Slot');
    expect(overlay).toContain('<div className="media-overlay"/>');
    expect(files.map((file) => file.content).join('\n')).not.toContain('SkinContainer');
    expect(files.map((file) => file.content).join('\n')).not.toContain('SkinPoster');
    expect(files.map((file) => file.content).join('\n')).not.toContain('placeholder?:');
    expect(files.map((file) => file.content).join('\n')).not.toContain('Parameters<');
    expect(files.map((file) => file.content).join('\n')).not.toContain('@ts-nocheck');
    expect(files.map((file) => file.content).join('\n')).not.toContain('$1');
    expect(output.styles.map((file) => file.fileName)).toEqual([
      'styles/styles.css',
      'styles/base.css',
      'styles/theme.css',
      'styles/buttons.css',
      'styles/container.css',
      'styles/controls.css',
      'styles/overlays.css',
      'styles/popups.css',
      'styles/poster.css',
      'styles/sliders.css',
    ]);
    expect(style(output, 'styles/styles.css')).toContain("@import './buttons.css'");
    expect(style(output, 'styles/styles.css')).toContain('@layer videojs.base, videojs.theme, videojs.components;');
    expect(style(output, 'styles/buttons.css')).toContain('@scope (.media-skin-video)');
    expect(style(output, 'styles/buttons.css')).toContain('.media-button {');
    expect(style(output, 'styles/buttons.css').match(/\.media-button \{/g)).toHaveLength(1);
    expect(style(output, 'styles/buttons.css')).not.toContain('.media-play-button {');
    expect(style(output, 'styles/buttons.css')).not.toContain(':where(');
    expect(style(output, 'styles/controls.css')).toContain('.media-controls {');
    expect(style(output, 'styles/controls.css')).toContain('background-color: var(--media-surface-background)');
    expect(style(output, 'styles/popups.css')).toContain('.media-surface {');
    expect(style(output, 'styles/container.css')).toContain('.media-container {');
    expect(style(output, 'styles/container.css')).not.toContain('.media-overlay {');
    expect(style(output, 'styles/overlays.css')).toContain('.media-overlay {');
    expect(style(output, 'styles/poster.css')).toContain('.media-poster {');
    expect(style(output, 'styles/theme.css')).toContain('.media-theme-default {');
    expect(style(output, 'styles/theme.css')).not.toContain('@scope');
    expect(output.styles.map((file) => file.content).join('\n')).not.toContain('--tw-');
    expect(style(output, 'styles/base.css')).toContain('@scope (.media-skin)');
    expect(style(output, 'styles/base.css')).toContain('button {');
    expect(style(output, 'styles/base.css')).toContain('[hidden] {');
  });

  it('bundles HTML registrations and markup into one Skin module', async () => {
    const output = await createFrameworkSkin(await loadSkinCatalog(), {
      rootDir: canonicalRoot,
      skin: 'default-video',
      projections: [{ framework: 'html' }],
    });
    const html = content(output, 'html', 'skin.ts');

    expect(html).toContain("import '@videojs/html/icons/element'");
    expect(html).toContain("import '@videojs/html/media/container'");
    expect(html).toContain("import '@videojs/html/ui/poster'");
    expect(html).toContain('export const skin = /* html */ `<media-container');
    expect(html).toContain('class="media-container media-skin media-skin-video media-theme-default"');
    expect(html).toContain('<slot></slot>');
    expect(html).toContain('<media-poster class="media-poster"><slot name="poster"></slot></media-poster>');
    expect(html).toContain('<div class="media-overlay"></div>');
    expect(html).toContain('<media-play-button class="media-button media-play-button">');
    expect(html).toContain('<media-tooltip side="top" class="media-surface media-tooltip">');
    expect(html).not.toContain('commandfor=');
    expect(html).not.toContain(' id=');
    expect(html).toContain('<media-time-slider class="media-slider">');
    expect(html).toContain('<media-volume-slider class="media-slider" thumb-alignment="edge" orientation="vertical">');
    expect(html).toContain('<media-time class="media-time" type="remaining" toggle>');
    expect(html).toContain('open-on-hover');
    expect(html).toContain('delay="200"');
    expect(html).toContain('close-delay="100"');
    expect(style(output, 'styles/buttons.css')).toContain('.media-button {');
    expect(style(output, 'styles/buttons.css').match(/\.media-button \{/g)).toHaveLength(1);
    expect(output.styles.map((file) => file.content).join('\n')).not.toContain('--tw-');
  });
});

function style(output: Awaited<ReturnType<typeof createFrameworkSkin>>, fileName: string): string {
  const file = output.styles.find((candidate) => candidate.fileName === fileName);
  if (!file) throw new Error(`Missing generated style file \`${fileName}\`.`);
  return file.content;
}

function content(
  output: Awaited<ReturnType<typeof createFrameworkSkin>>,
  framework: 'html' | 'react',
  fileName: string
): string {
  const file = output.files.find((candidate) => candidate.framework === framework && candidate.fileName === fileName);
  if (!file) throw new Error(`Missing generated ${framework} file \`${fileName}\`.`);
  return file.content;
}
