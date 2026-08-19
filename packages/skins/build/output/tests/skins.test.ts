import { describe, expect, it } from 'vitest';
import { loadSkinCatalog } from '../../catalog';
import { emitHtmlSkin } from '../html';
import { emitReactSkin } from '../react';

describe('Skin output', () => {
  it('emits editable React modules and role-based vanilla stylesheets', async () => {
    const output = await emitReactSkin(await loadSkinCatalog(), {
      skin: 'default-video',
    });
    const files = output.files;
    const skin = content(output, 'skin.tsx');
    const buttonTooltip = content(output, 'components/buttons/button-tooltip.tsx');
    const playButton = content(output, 'components/buttons/play-button.tsx');
    const overlay = content(output, 'components/layout/overlay.tsx');
    const poster = content(output, 'components/layout/poster.tsx');
    const container = content(output, 'components/layout/container.tsx');
    const volumeSlider = content(output, 'components/sliders/volume-slider.tsx');
    const timeSlider = content(output, 'components/sliders/time-slider.tsx');
    const settingsMenu = content(output, 'components/menus/settings-menu.tsx');
    const qualityMenu = content(output, 'components/menus/quality-menu.tsx');
    const radioGroup = content(output, 'components/menus/radio-group.tsx');
    const radioItem = content(output, 'components/menus/radio-item.tsx');
    const submenu = content(output, 'components/menus/submenu.tsx');
    const videoGestures = content(output, 'components/video-gestures.tsx');
    const videoHotkeys = content(output, 'components/video-hotkeys.tsx');

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
    expect(skin).toMatch(/<Container className=.*\{\.\.\.props\}>/s);
    expect(skin).toContain('{children}');
    expect(skin).toContain('<Poster src={isPosterString ? poster : undefined}');
    expect(skin).toContain('media-skin media-skin-video media-theme-default');
    expect(skin).not.toContain('className="media-surface');
    expect(skin).not.toContain('SeekButton');
    expect(buttonTooltip).toContain('export interface ButtonTooltipProps extends TooltipPrimitive.RootProps');
    expect(playButton).toContain('export function PlayButton({ className, ...props }: PlayButtonProps = {})');
    expect(playButton).toContain('Omit<PlayButtonPrimitive.Props, "children">');
    expect(volumeSlider).toContain('export function VolumeSlider({ className, ...props }: VolumeSliderProps = {})');
    expect(volumeSlider).toContain('resolveClassName(className, state)');
    expect(timeSlider).toContain('renderChapter={props =>');
    expect(timeSlider).toContain('<TimeSliderPrimitive.ChapterTitle');
    expect(timeSlider).not.toContain('<Template');
    expect(settingsMenu).toContain('<Text className="media-sr-only" token={settingsText.key}>');
    expect(qualityMenu).toContain('renderItem={(props, item) =>');
    expect(qualityMenu).toContain('{item.tier ? <sup');
    expect(qualityMenu).not.toContain('<Template');
    expect(qualityMenu).toContain('<RadioItem {...props}>');
    expect(qualityMenu).toContain('/>');
    expect(qualityMenu).not.toContain('</QualityRadioGroup>');
    expect(submenu).toContain('export function Submenu');
    expect(submenu).toContain('children?: ReactNode');
    expect(submenu).toContain('icon: ReactNode');
    expect(submenu).not.toContain('MenuPrimitive.TriggerProps["children"]');
    expect(submenu).toContain('<MenuPrimitive.Root {...props}>');
    expect(radioItem).toContain('<MenuPrimitive.RadioItem className=');
    expect(radioItem).toContain('{...props}>');
    expect(radioItem).toContain('<MenuPrimitive.ItemIndicator forceMount');
    expect(radioItem).not.toContain('checked=');
    expect(radioGroup).toContain('interface QualityRadioGroupProps extends QualityRadioGroupPrimitive.Props');
    expect(radioGroup).toContain('<QualityRadioGroupPrimitive className=');
    expect(radioGroup).toContain('{...props}/>');
    expect(videoHotkeys.match(/<HotkeyPrimitive /g)).toHaveLength(17);
    expect(videoGestures.match(/<GesturePrimitive /g)).toHaveLength(5);
    expect(container).toContain('export function Container');
    expect(container).toContain('ContainerProps');
    expect(container).toContain('<ContainerPrimitive className=');
    expect(container).toContain('{...props}>');
    expect(container).not.toContain('poster');
    expect(container).not.toContain('placeholder');
    expect(poster).toContain('export function Poster');
    expect(poster).toContain('PosterProps');
    expect(poster).toContain('<PosterPrimitive render={children} className=');
    expect(poster).toContain('{...props}/>');
    expect(poster).not.toContain('<Slot');
    expect(overlay).toContain('export function Overlay({ className, ...props }: OverlayProps = {})');
    expect(overlay).toContain('<div className={cn("media-overlay", className)} {...props}/>');
    expect(files.map((file) => file.content).join('\n')).toContain('resolveClassName(className, state)');
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
    const output = await emitHtmlSkin(await loadSkinCatalog(), {
      skin: 'default-video',
    });
    const html = content(output, 'skin.ts');

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
    expect(html).toContain('<media-captions-button class="media-button media-captions-button"');
    expect(html).toContain('<media-cast-button class="media-button media-cast-button"');
    expect(html).toContain('<media-airplay-button class="media-button media-airplay-button"');
    expect(html).toContain('<media-pip-button class="media-button media-pip-button"');
    expect(html).toContain('<div class="media-status-indicator-overlay">');
    expect(html).toContain('actions="toggleSubtitles,toggleFullscreen,togglePictureInPicture"');
    expect(html).toContain('<media-volume-indicator class="media-volume-indicator">');
    expect(html).toContain('<media-error-dialog class="media-error-dialog">');
    expect(html).toContain('<media-alert-dialog-title class="media-error-dialog-title">');
    expect(html).toContain('<div class="media-overlay"></div>');
    expect(html).toContain('<media-play-button class="media-button media-play-button"');
    expect(html).not.toContain('media-seek-button');
    expect(html).not.toContain('@videojs/html/ui/seek-button');
    expect(html).toContain('<media-tooltip trigger="');
    expect(html).toContain('side="top" class="media-surface media-tooltip"');
    expect(html.match(/data-has-submenu=""/g)).toHaveLength(4);

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]!);
    const relationships = [...html.matchAll(/\s(?:commandfor|trigger)="([^"]+)"/g)].map((match) => match[1]!);

    expect(new Set(ids).size).toBe(ids.length);
    expect(relationships.length).toBeGreaterThan(0);
    expect(relationships.every((id) => ids.includes(id))).toBe(true);
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
    const catalog = await loadSkinCatalog();
    const [reactOutput, htmlOutput] = await Promise.all([
      emitReactSkin(catalog, { skin: 'minimal-video', iconSet: 'minimal' }),
      emitHtmlSkin(catalog, { skin: 'minimal-video', iconSet: 'minimal' }),
    ]);
    const react = content(reactOutput, 'skin.tsx');
    const html = content(htmlOutput, 'skin.ts');

    expect(react).toContain('export interface MinimalVideoSkinProps extends Omit<ContainerProps');
    expect(react).toContain('media-skin media-skin-video-minimal media-theme-minimal');
    expect(react).toContain('<VolumePopover side="right" orientation="horizontal"/>');
    expect(react).toContain('<TimePrimitive.Group className="media-time-group">');
    expect(react).toContain('<ControlsPrimitive.Group className="media-controls-remote">');
    expect(react).not.toContain('SeekButton');
    expect(react).not.toContain('placeholder?:');

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
    expect(style(reactOutput, 'styles/controls.css')).toContain('@scope (.media-skin-video-minimal)');
    expect(style(reactOutput, 'styles/theme.css')).toContain('.media-theme-minimal {');
    expect(style(reactOutput, 'styles/theme.css')).not.toContain('.media-theme-default {');
  });
});

type SkinOutput = Awaited<ReturnType<typeof emitReactSkin>>;

function style(output: SkinOutput, fileName: string): string {
  const file = output.styles.find((candidate) => candidate.path === fileName);
  if (!file) throw new Error(`Missing generated style file \`${fileName}\`.`);
  return file.content;
}

function content(output: SkinOutput, fileName: string): string {
  const file = output.files.find((candidate) => candidate.path === fileName);
  if (!file) throw new Error(`Missing generated file \`${fileName}\`.`);
  return file.content;
}
