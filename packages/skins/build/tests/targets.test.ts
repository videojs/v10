import { describe, expect, it } from 'vitest';
import { loadSkinCatalog } from '../catalog';
import { emitFrameworkSkin } from '../targets';

describe('emitFrameworkSkin', () => {
  it('emits editable React modules and role-based vanilla stylesheets', async () => {
    const output = await emitFrameworkSkin(await loadSkinCatalog(), {
      skin: 'default-video',
      targets: [{ framework: 'react' }, { framework: 'html' }],
    });
    const files = output.files.filter((candidate) => candidate.framework === 'react');
    const skin = content(output, 'react', 'skin.tsx');
    const buttonTooltip = content(output, 'react', 'components/buttons/button-tooltip.tsx');
    const playButton = content(output, 'react', 'components/buttons/play-button.tsx');
    const overlay = content(output, 'react', 'components/layout/overlay.tsx');
    const poster = content(output, 'react', 'components/layout/poster.tsx');
    const container = content(output, 'react', 'components/layout/container.tsx');
    const volumeSlider = content(output, 'react', 'components/sliders/volume-slider.tsx');
    const timeSlider = content(output, 'react', 'components/sliders/time-slider.tsx');
    const settingsMenu = content(output, 'react', 'components/menus/settings-menu.tsx');
    const qualityMenu = content(output, 'react', 'components/menus/quality-menu.tsx');
    const radioGroup = content(output, 'react', 'components/menus/radio-group.tsx');
    const radioItem = content(output, 'react', 'components/menus/radio-item.tsx');
    const submenu = content(output, 'react', 'components/menus/submenu.tsx');
    const videoGestures = content(output, 'react', 'components/video-gestures.tsx');
    const videoHotkeys = content(output, 'react', 'components/video-hotkeys.tsx');

    expect(files.map((file) => file.path)).toEqual([
      'components/buttons/airplay-button.tsx',
      'components/buttons/button-tooltip.tsx',
      'components/buttons/captions-button.tsx',
      'components/buttons/cast-button.tsx',
      'components/buttons/fullscreen-button.tsx',
      'components/buttons/mute-button.tsx',
      'components/buttons/pip-button.tsx',
      'components/buttons/play-button.tsx',
      'components/controls/volume-popover.tsx',
      'components/feedback/buffering-indicator.tsx',
      'components/feedback/error-dialog.tsx',
      'components/feedback/seek-indicator.tsx',
      'components/feedback/status-announcer.tsx',
      'components/feedback/status-indicator.tsx',
      'components/feedback/video-status-indicators.tsx',
      'components/feedback/volume-indicator.tsx',
      'components/layout/container.tsx',
      'components/layout/overlay.tsx',
      'components/layout/poster.tsx',
      'components/menus/audio-track-menu.tsx',
      'components/menus/captions-menu.tsx',
      'components/menus/menu-chevron.tsx',
      'components/menus/playback-rate-menu.tsx',
      'components/menus/quality-menu.tsx',
      'components/menus/radio-group.tsx',
      'components/menus/radio-item.tsx',
      'components/menus/settings-menu.tsx',
      'components/menus/submenu.tsx',
      'components/menus/video-settings-menu.tsx',
      'components/sliders/time-slider.tsx',
      'components/sliders/volume-slider.tsx',
      'components/video-gestures.tsx',
      'components/video-hotkeys.tsx',
      'skin.tsx',
    ]);
    expect(skin).toContain('from "./components/buttons/play-button"');
    expect(skin).toContain('from "./components/feedback/buffering-indicator"');
    expect(skin).toContain('export interface DefaultVideoSkinProps extends Omit<ContainerProps');
    expect(skin).toContain('<Container {...containerProps}');
    expect(skin).toContain('{children}');
    expect(skin).toContain('poster && <Poster');
    expect(skin).toContain('media-skin media-skin-video media-theme-default');
    expect(skin).not.toContain('className="media-surface');
    expect(skin).not.toContain('SeekButton');
    expect(buttonTooltip).toContain('export interface ButtonTooltipProps extends TooltipTarget.RootProps');
    expect(playButton).toContain('export function PlayButton()');
    expect(playButton).not.toContain('PlayButtonProps');
    expect(volumeSlider).toContain('export function VolumeSlider(props: VolumeSliderProps = {})');
    expect(volumeSlider).not.toContain('resolveClassName');
    expect(timeSlider).toContain('renderChapter={props =>');
    expect(timeSlider).toContain('<TimeSliderTarget.ChapterTitle');
    expect(timeSlider).not.toContain('<Template');
    expect(settingsMenu).toContain('const t = useTranslator()');
    expect(qualityMenu).toContain('renderItem={(props, item) =>');
    expect(qualityMenu).toContain('{item.tier ? <sup');
    expect(qualityMenu).not.toContain('<Template');
    expect(qualityMenu).toContain('<RadioItem {...props} checked={item.checked}>');
    expect(qualityMenu).toContain('/>');
    expect(qualityMenu).not.toContain('</QualityRadioGroup>');
    expect(submenu).toContain('export function Submenu');
    expect(submenu).toContain('<MenuTarget.Root>');
    expect(radioItem).toContain('<MenuTarget.RadioItem {...props}');
    expect(radioItem).toContain('checked={checked}>');
    expect(radioGroup).toContain('interface QualityRadioGroupProps extends QualityRadioGroupTarget.Props');
    expect(radioGroup).toContain('<QualityRadioGroupTarget {...props}');
    expect(videoHotkeys.match(/<HotkeyTarget /g)).toHaveLength(17);
    expect(videoGestures.match(/<GestureTarget /g)).toHaveLength(5);
    expect(container).toContain('export function Container');
    expect(container).toContain('ContainerProps');
    expect(container).toContain('<ContainerTarget {...props}');
    expect(container).not.toContain('poster');
    expect(container).not.toContain('placeholder');
    expect(poster).toContain('export function Poster');
    expect(poster).toContain('PosterProps');
    expect(poster).toContain('<PosterTarget {...props}');
    expect(poster).not.toContain('<Slot');
    expect(overlay).toContain('export function Overlay()');
    expect(overlay).toContain('<div className="media-overlay"/>');
    expect(files.map((file) => file.content).join('\n')).not.toContain('resolveClassName');
    expect(files.map((file) => file.content).join('\n')).not.toContain('SkinContainer');
    expect(files.map((file) => file.content).join('\n')).not.toContain('SkinPoster');
    expect(files.map((file) => file.content).join('\n')).not.toContain('placeholder?:');
    expect(files.map((file) => file.content).join('\n')).not.toContain('Parameters<');
    expect(files.map((file) => file.content).join('\n')).not.toContain('@ts-nocheck');
    expect(files.map((file) => file.content).join('\n')).not.toContain('$1');
    expect(output.styles.map((file) => file.path)).toEqual([
      'styles/styles.css',
      'styles/base.css',
      'styles/captions.css',
      'styles/video.css',
      'styles/theme.css',
      'styles/buttons.css',
      'styles/container.css',
      'styles/controls.css',
      'styles/dialog.css',
      'styles/indicator.css',
      'styles/menus.css',
      'styles/overlays.css',
      'styles/popups.css',
      'styles/poster.css',
      'styles/sliders.css',
    ]);
    expect(style(output, 'styles/styles.css')).toContain("@import './buttons.css'");
    expect(style(output, 'styles/styles.css')).toContain('@layer videojs.base, videojs.theme, videojs.components;');
    expect(style(output, 'styles/buttons.css')).toContain('@scope (.media-skin-video)');
    expect(style(output, 'styles/buttons.css')).toContain('.media-button {');
    expect(style(output, 'styles/buttons.css')).not.toContain('.media-play-button {');
    expect(style(output, 'styles/buttons.css')).not.toContain(':where(');
    expect(style(output, 'styles/controls.css')).toContain('.media-controls-root {');
    expect(style(output, 'styles/controls.css')).toContain('.media-controls-primary {');
    expect(style(output, 'styles/controls.css')).toContain('.media-controls-secondary {');
    expect(style(output, 'styles/dialog.css')).toContain('.media-error-dialog {');
    expect(style(output, 'styles/menus.css')).toContain('.media-settings {');
    expect(style(output, 'styles/controls.css')).toContain('backdrop-filter: blur(16px) saturate(150%)');
    expect(style(output, 'styles/buttons.css')).not.toContain('.media-seek-button-label');
    expect(style(output, 'styles/popups.css')).toContain('.media-surface {');
    expect(style(output, 'styles/container.css')).toContain('.media-container {');
    expect(style(output, 'styles/container.css')).not.toContain('.media-overlay {');
    expect(style(output, 'styles/overlays.css')).toContain('.media-overlay {');
    expect(style(output, 'styles/indicator.css')).toContain('.media-buffering-indicator {');
    expect(style(output, 'styles/indicator.css')).toContain('.media-status-indicator-overlay {');
    expect(style(output, 'styles/overlays.css')).not.toContain('.media-buffering-indicator {');
    expect(style(output, 'styles/poster.css')).toContain('.media-poster {');
    expect(style(output, 'styles/theme.css')).toContain('.media-theme-default {');
    expect(style(output, 'styles/theme.css')).not.toContain('@scope');
    expect(output.styles.map((file) => file.content).join('\n')).not.toContain('--tw-');
    expect(style(output, 'styles/base.css')).toContain('@scope (.media-skin)');
    expect(style(output, 'styles/base.css')).toContain('button {');
    expect(style(output, 'styles/base.css')).toContain('[hidden] {');
    expect(style(output, 'styles/captions.css')).toContain('video::-webkit-media-text-track-container');
    expect(style(output, 'styles/container.css')).not.toContain('--media-caption-track-y');
  });

  it('bundles HTML registrations and markup into one Skin module', async () => {
    const output = await emitFrameworkSkin(await loadSkinCatalog(), {
      skin: 'default-video',
      targets: [{ framework: 'html' }],
    });
    const html = content(output, 'html', 'skin.ts');

    expect(html).toContain("import '@videojs/html/icons/element'");
    expect(html).toContain("import '@videojs/html/ui/airplay-button'");
    expect(html).toContain("import '@videojs/html/media/container'");
    expect(html).toContain("import '@videojs/html/ui/poster'");
    expect(html).toContain("import '@videojs/html/ui/buffering-indicator'");
    expect(html).toContain("import '@videojs/html/ui/captions-button'");
    expect(html).toContain("import '@videojs/html/ui/cast-button'");
    expect(html).toContain("import '@videojs/html/ui/error-dialog'");
    expect(html).toContain("import '@videojs/html/ui/pip-button'");
    expect(html).toContain("import '@videojs/html/ui/seek-indicator'");
    expect(html).toContain("import '@videojs/html/ui/status-announcer'");
    expect(html).toContain("import '@videojs/html/ui/status-indicator'");
    expect(html).toContain("import '@videojs/html/ui/time-slider-chapters'");
    expect(html).toContain("import '@videojs/html/ui/quality-radio-group'");
    expect(html).toContain("import '@videojs/html/ui/hotkey'");
    expect(html).toContain("import '@videojs/html/ui/gesture'");
    expect(html).toContain("import '@videojs/html/ui/volume-indicator'");
    expect(html).toContain('export const skin = /* html */ `<media-container');
    expect(html).toContain('class="media-container media-skin media-skin-video media-theme-default"');
    expect(html).toContain('<slot></slot>');
    expect(html).toContain('<media-poster class="media-poster"><slot name="poster"></slot></media-poster>');
    expect(html).toContain('<media-buffering-indicator class="media-buffering-indicator">');
    expect(html).toContain('<media-captions-button class="media-button media-captions-button">');
    expect(html).toContain('<media-cast-button class="media-button media-cast-button">');
    expect(html).toContain('<media-airplay-button class="media-button media-airplay-button">');
    expect(html).toContain('<media-pip-button class="media-button media-pip-button">');
    expect(html).toContain('<div class="media-status-indicator-overlay">');
    expect(html).toContain('actions="toggleSubtitles,toggleFullscreen,togglePictureInPicture"');
    expect(html).toContain('<media-volume-indicator class="media-volume-indicator">');
    expect(html).toContain('<media-error-dialog class="media-error-dialog">');
    expect(html).toContain('<media-alert-dialog-title class="media-error-dialog-title">');
    expect(html).toContain('<div class="media-overlay"></div>');
    expect(html).toContain('<media-play-button class="media-button media-play-button">');
    expect(html).not.toContain('media-seek-button');
    expect(html).not.toContain('@videojs/html/ui/seek-button');
    expect(html).toContain('<media-tooltip side="top" class="media-surface media-tooltip">');
    expect(html).toContain('commandfor="settings-menu"');
    expect(html).toContain('id="settings-trigger"');
    expect(html).toContain('trigger="settings-trigger"');
    expect(html).toContain('id="settings-quality-menu"');
    expect(html).toContain('<media-quality-radio-group class="media-radio-group">');
    expect(html).toContain('<span data-part="label"></span>');
    expect(html.match(/<media-hotkey /g)).toHaveLength(17);
    expect(html.match(/<media-gesture /g)).toHaveLength(5);
    expect(html).toContain('<media-time-slider class="media-slider">');
    expect(html).toContain('<media-time-slider-chapters class="media-slider-chapters">');
    expect(html).toContain('<template>');
    expect(html).toContain('<div class="media-slider-chapter">');
    expect(html).toContain('<media-time-slider-chapter-title class="media-chapter-title">');
    expect(html).toContain('<media-volume-slider class="media-slider" thumb-alignment="edge" orientation="vertical">');
    expect(html).toContain('<media-time class="media-time-remaining" type="remaining" toggle>');
    expect(html).toContain('<media-controls-group class="media-controls-primary">');
    expect(html).toContain('<media-controls-group class="media-controls-secondary">');
    expect(html).toContain('open-on-hover');
    expect(html).toContain('delay="200"');
    expect(html).toContain('close-delay="100"');
    expect(style(output, 'styles/buttons.css')).toContain('.media-button {');
    expect(output.styles.map((file) => file.content).join('\n')).not.toContain('--tw-');
  });

  it('projects the minimal video composition and theme for both frameworks', async () => {
    const output = await emitFrameworkSkin(await loadSkinCatalog(), {
      skin: 'minimal-video',
      iconSet: 'minimal',
      targets: [{ framework: 'react' }, { framework: 'html' }],
    });
    const react = content(output, 'react', 'skin.tsx');
    const html = content(output, 'html', 'skin.ts');

    expect(react).toContain('export interface MinimalVideoSkinProps extends Omit<ContainerProps');
    expect(react).toContain('media-skin media-skin-video-minimal media-theme-minimal');
    expect(react).toContain('<VolumePopover side="right" orientation="horizontal"/>');
    expect(react).toContain('<TimeTarget.Group className="media-time-group">');
    expect(react).toContain('<ControlsTarget.Group className="media-controls-remote">');
    expect(react).not.toContain('SeekButton');
    expect(react).not.toContain('placeholder');

    expect(html).toContain("import '@videojs/html/icons/element/minimal'");
    expect(html).toContain('media-skin media-skin-video-minimal media-theme-minimal');
    expect(html).toContain('orientation="horizontal"');
    expect(html).toContain('<media-time-group class="media-time-group">');
    expect(html).toContain('<media-controls-group class="media-controls-remote">');
    expect(html).toContain('<media-error-dialog class="media-error-dialog">');
    expect(html).toContain('class="media-status-indicator"');
    expect(html).toContain('<media-volume-indicator class="media-volume-indicator">');
    expect(html).not.toContain('media-error-dialog-minimal');
    expect(html).not.toContain('media-status-indicator-minimal');
    expect(html).not.toContain('media-volume-indicator-minimal');
    expect(html).not.toContain('media-seek-button');
    expect(style(output, 'styles/controls.css')).toContain('@scope (.media-skin-video-minimal)');
    expect(style(output, 'styles/theme.css')).toContain('.media-theme-minimal {');
    expect(style(output, 'styles/theme.css')).not.toContain('.media-theme-default {');
  });
});

function style(output: Awaited<ReturnType<typeof emitFrameworkSkin>>, fileName: string): string {
  const file = output.styles.find((candidate) => candidate.path === fileName);
  if (!file) throw new Error(`Missing generated style file \`${fileName}\`.`);
  return file.content;
}

function content(
  output: Awaited<ReturnType<typeof emitFrameworkSkin>>,
  framework: 'html' | 'react',
  fileName: string
): string {
  const file = output.files.find((candidate) => candidate.framework === framework && candidate.path === fileName);
  if (!file) throw new Error(`Missing generated ${framework} file \`${fileName}\`.`);
  return file.content;
}
