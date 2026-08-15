import { defineConfig, html, rewrite } from '@videojs/compiler';
import { lowerTemplateParts, lowerTemplates, lowerText } from '@videojs/compiler/ast';
import type { SkinStyleManifest } from '../styles/manifest';
import { type SkinStyleTarget, skinStyles } from '../styles/transform';

interface CreateCompilerHtmlConfigOptions {
  style: SkinStyleTarget;
  styles: SkinStyleManifest;
  rootComponentName?: string | undefined;
  rootClassName?: string | undefined;
}

interface HtmlComponentDescriptor {
  modules: readonly string[];
  elements: Readonly<Record<string, string>>;
}

const htmlComponents: Readonly<Record<string, HtmlComponentDescriptor>> = {
  AirPlayButton: {
    modules: ['@videojs/html/ui/airplay-button'],
    elements: { AirPlayButtonPrimitive: 'media-airplay-button' },
  },
  BufferingIndicator: {
    modules: ['@videojs/html/ui/buffering-indicator'],
    elements: { BufferingIndicatorPrimitive: 'media-buffering-indicator' },
  },
  CaptionsButton: {
    modules: ['@videojs/html/ui/captions-button'],
    elements: { CaptionsButtonPrimitive: 'media-captions-button' },
  },
  CastButton: {
    modules: ['@videojs/html/ui/cast-button'],
    elements: { CastButtonPrimitive: 'media-cast-button' },
  },
  Container: {
    modules: ['@videojs/html/media/container'],
    elements: { ContainerPrimitive: 'media-container' },
  },
  Controls: {
    modules: ['@videojs/html/ui/controls'],
    elements: { 'Controls.Root': 'media-controls', 'Controls.Group': 'media-controls-group' },
  },
  ErrorDialog: {
    modules: ['@videojs/html/ui/error-dialog'],
    elements: {
      'ErrorDialogPrimitive.Popup': 'media-error-dialog',
      'ErrorDialogPrimitive.Title': 'media-alert-dialog-title',
      'ErrorDialogPrimitive.Description': 'media-alert-dialog-description',
      'ErrorDialogPrimitive.Close': 'media-alert-dialog-close',
    },
  },
  FullscreenButton: {
    modules: ['@videojs/html/ui/fullscreen-button'],
    elements: { FullscreenButtonPrimitive: 'media-fullscreen-button' },
  },
  Gesture: {
    modules: ['@videojs/html/ui/gesture'],
    elements: { Gesture: 'media-gesture' },
  },
  Hotkey: {
    modules: ['@videojs/html/ui/hotkey'],
    elements: { Hotkey: 'media-hotkey' },
  },
  MuteButton: {
    modules: ['@videojs/html/ui/mute-button'],
    elements: { MuteButtonPrimitive: 'media-mute-button' },
  },
  Menu: {
    modules: ['@videojs/html/ui/menu'],
    elements: {
      'Menu.Content': 'media-menu',
      'Menu.Group': 'div',
      'Menu.GroupLabel': 'media-menu-group-label',
      'Menu.Item': 'media-menu-item',
      'Menu.ItemIndicator': 'media-menu-item-indicator',
      'Menu.RadioGroup': 'media-menu-radio-group',
      'Menu.RadioItem': 'media-menu-radio-item',
      'Menu.Separator': 'div',
      'Menu.CheckboxItem': 'media-menu-checkbox-item',
    },
  },
  PlayButton: {
    modules: ['@videojs/html/ui/play-button'],
    elements: { PlayButtonPrimitive: 'media-play-button' },
  },
  PiPButton: {
    modules: ['@videojs/html/ui/pip-button'],
    elements: { PiPButtonPrimitive: 'media-pip-button' },
  },
  Popover: {
    modules: ['@videojs/html/ui/popover'],
    elements: { 'Popover.Popup': 'media-popover' },
  },
  Poster: {
    modules: ['@videojs/html/ui/poster'],
    elements: { PosterPrimitive: 'media-poster' },
  },
  SeekButton: {
    modules: ['@videojs/html/ui/seek-button'],
    elements: { SeekButtonPrimitive: 'media-seek-button' },
  },
  SeekIndicator: {
    modules: ['@videojs/html/ui/seek-indicator'],
    elements: {
      'SeekIndicatorPrimitive.Root': 'media-seek-indicator',
      'SeekIndicatorPrimitive.Value': 'media-seek-indicator-value',
    },
  },
  Slider: {
    modules: ['@videojs/html/ui/slider'],
    elements: {
      'Slider.Thumbnail.Root': 'div',
      'Slider.Thumbnail.Image': 'media-slider-thumbnail',
    },
  },
  StatusAnnouncer: {
    modules: ['@videojs/html/ui/status-announcer'],
    elements: { StatusAnnouncerPrimitive: 'media-status-announcer' },
  },
  StatusIndicator: {
    modules: ['@videojs/html/ui/status-indicator'],
    elements: {
      'StatusIndicatorPrimitive.Root': 'media-status-indicator',
      'StatusIndicatorPrimitive.Value': 'media-status-indicator-value',
    },
  },
  Text: { modules: ['@videojs/html/i18n'], elements: {} },
  Time: {
    modules: ['@videojs/html/ui/time'],
    elements: {
      'TimePrimitive.Group': 'media-time-group',
      'TimePrimitive.Separator': 'media-time-separator',
      'TimePrimitive.Value': 'media-time',
    },
  },
  TimeSlider: {
    modules: ['@videojs/html/ui/time-slider', '@videojs/html/ui/time-slider-chapters'],
    elements: {
      'TimeSliderPrimitive.Root': 'media-time-slider',
      'TimeSliderPrimitive.Track': 'media-slider-track',
      'TimeSliderPrimitive.Fill': 'media-slider-fill',
      'TimeSliderPrimitive.Buffer': 'media-slider-buffer',
      'TimeSliderPrimitive.Thumb': 'media-slider-thumb',
      'TimeSliderPrimitive.Chapters': 'media-time-slider-chapters',
      'TimeSliderPrimitive.ChapterTitle': 'media-time-slider-chapter-title',
      'TimeSliderPrimitive.Preview': 'media-slider-preview',
      'TimeSliderPrimitive.Value': 'media-slider-value',
    },
  },
  Tooltip: {
    modules: ['@videojs/html/ui/tooltip', '@videojs/html/ui/tooltip-group'],
    elements: {
      'Tooltip.Provider': 'media-tooltip-group',
      'TooltipPrimitive.Popup': 'media-tooltip',
      'TooltipPrimitive.Label': 'media-tooltip-label',
      'TooltipPrimitive.Shortcut': 'media-tooltip-shortcut',
    },
  },
  VolumeSlider: {
    modules: ['@videojs/html/ui/volume-slider'],
    elements: {
      'VolumeSliderPrimitive.Root': 'media-volume-slider',
      'VolumeSliderPrimitive.Track': 'media-slider-track',
      'VolumeSliderPrimitive.Fill': 'media-slider-fill',
      'VolumeSliderPrimitive.Thumb': 'media-slider-thumb',
    },
  },
  VolumeIndicator: {
    modules: ['@videojs/html/ui/volume-indicator'],
    elements: {
      'VolumeIndicatorPrimitive.Root': 'media-volume-indicator',
      'VolumeIndicatorPrimitive.Fill': 'media-volume-indicator-fill',
      'VolumeIndicatorPrimitive.Value': 'media-volume-indicator-value',
    },
  },
  QualityRadioGroup: {
    modules: ['@videojs/html/ui/quality-radio-group'],
    elements: { QualityRadioGroup: 'media-quality-radio-group' },
  },
  AudioTrackRadioGroup: {
    modules: ['@videojs/html/ui/audio-track-radio-group'],
    elements: { AudioTrackRadioGroup: 'media-audio-track-radio-group' },
  },
  PlaybackRateRadioGroup: {
    modules: ['@videojs/html/ui/playback-rate-radio-group'],
    elements: { PlaybackRateRadioGroup: 'media-playback-rate-radio-group' },
  },
  CaptionsRadioGroup: {
    modules: ['@videojs/html/ui/captions-radio-group'],
    elements: { CaptionsRadioGroup: 'media-captions-radio-group' },
  },
};

const componentTags = Object.fromEntries(
  Object.values(htmlComponents).flatMap(({ elements }) => Object.entries(elements))
);

const iconNames = {
  AirPlayEnterIcon: 'airplay-enter',
  AirPlayExitIcon: 'airplay-exit',
  CaptionsOffIcon: 'captions-off',
  CaptionsOnIcon: 'captions-on',
  CastEnterIcon: 'cast-enter',
  CastExitIcon: 'cast-exit',
  CheckIcon: 'check',
  ChevronIcon: 'chevron',
  FullscreenEnterIcon: 'fullscreen-enter',
  FullscreenExitIcon: 'fullscreen-exit',
  GearIcon: 'gear',
  PauseIcon: 'pause',
  PipEnterIcon: 'pip-enter',
  PipExitIcon: 'pip-exit',
  PlayIcon: 'play',
  RestartIcon: 'restart',
  SeekIcon: 'seek',
  SpeechIcon: 'speech',
  SpeedIcon: 'speed',
  SpinnerIcon: 'spinner',
  SwitchesIcon: 'switches',
  VolumeHighIcon: 'volume-high',
  VolumeLowIcon: 'volume-low',
  VolumeOffIcon: 'volume-off',
} as const;

/** Create the compiler policy for an HTML Skin projection. */
export function createCompilerHtmlConfig(styleTarget: CreateCompilerHtmlConfigOptions) {
  const rootComponentName = styleTarget.rootComponentName ?? 'DefaultVideoSkin';
  return defineConfig({
    target: html({
      imports: {
        '@videojs/core/components': false,
        '@videojs/icons/components': false,
        '@videojs/jsx': false,
      },
    }),
    plugins: [
      skinStyles({ manifest: styleTarget.styles, target: styleTarget.style }),
      {
        name: '@videojs/skins:html-text',
        setup: () => ({
          transform: lowerText({
            targetTag: 'media-text',
            descriptors: ['settingsText', 'qualityText', 'audioText', 'speedText', 'captionsText'],
            lowering: { kind: 'descriptor' },
          }),
        }),
      },
      {
        name: '@videojs/skins:html-template-parts',
        setup: () => ({
          transform: lowerTemplateParts({
            parts: {
              'QualitySettingsMenu:selected-label': {
                kind: 'attribute',
                attribute: 'data-part',
                value: 'hint',
                tag: 'span',
              },
              'AudioTrackSettingsMenu:selected-label': {
                kind: 'attribute',
                attribute: 'data-part',
                value: 'hint',
                tag: 'span',
              },
              'PlaybackRateSettingsMenu:selected-label': {
                kind: 'attribute',
                attribute: 'data-part',
                value: 'hint',
                tag: 'span',
              },
              'CaptionsSettingsMenu:selected-label': {
                kind: 'attribute',
                attribute: 'data-part',
                value: 'hint',
                tag: 'span',
              },
              'quality-option:label': { kind: 'attribute', attribute: 'data-part', value: 'label', tag: 'span' },
              'quality-option:tier': {
                kind: 'attribute',
                attribute: 'data-part',
                value: 'tier',
                tag: 'sup',
              },
              'quality-option:badge': { kind: 'attribute', attribute: 'data-part', value: 'badge', tag: 'span' },
              'audio-track-option:label': {
                kind: 'attribute',
                attribute: 'data-part',
                value: 'label',
                tag: 'span',
              },
              'playback-rate-option:label': {
                kind: 'attribute',
                attribute: 'data-part',
                value: 'label',
                tag: 'span',
              },
              'captions-option:label': {
                kind: 'attribute',
                attribute: 'data-part',
                value: 'label',
                tag: 'span',
              },
            },
          }),
        }),
      },
      {
        name: '@videojs/skins:html-templates',
        setup: () => ({
          transform: lowerTemplates({
            templates: {
              chapter: { kind: 'element', parent: 'TimeSliderPrimitive.Chapters', rootTag: 'div' },
              'quality-option': { kind: 'element', parent: 'QualityRadioGroup' },
              'audio-track-option': { kind: 'element', parent: 'AudioTrackRadioGroup' },
              'playback-rate-option': { kind: 'element', parent: 'PlaybackRateRadioGroup' },
              'captions-option': { kind: 'element', parent: 'CaptionsRadioGroup' },
            },
          }),
        }),
      },
      rewrite(
        (code) => {
          const cn = code.import('@videojs/utils/style', 'cn');
          const rootContainer = code.function(rootComponentName).jsx.element('Container');
          const containerPrimitiveClassName = code
            .function('Container')
            .jsx.props('className')
            .on('ContainerPrimitive');
          const submenuNames = ['Quality', 'AudioTrack', 'PlaybackRate', 'Captions'] as const;
          const submenuIds = {
            Quality: 'settings-quality-menu',
            AudioTrack: 'settings-audio-menu',
            PlaybackRate: 'settings-speed-menu',
            Captions: 'settings-captions-menu',
          } as const;

          return [
            rootContainer.addProp('className', () => {
              if (!styleTarget.rootClassName) {
                throw new Error('HTML Skin root lowering requires `rootClassName`.');
              }
              return styleTarget.rootClassName;
            }),
            containerPrimitiveClassName.replace(({ value }) => code.value.array([value, 'className'])),
            code.function('Container').setProps(['children', 'className']),
            code.jsx.element('Slot').replace('slot'),
            code.jsx.element('ErrorDialogPrimitive.Root').unwrap(),
            code.jsx.element('OverlayPrimitive').replace('div'),
            code.jsx.element('InputIndicatorOverlayPrimitive').replace('div'),
            code.jsx.element('PreviewValuePrimitive').replace('div'),
            code.jsx.element('HintPrimitive').replace('span'),
            code.jsx.element('OptionLabelPrimitive').replace('span'),
            code.jsx.element('Popover.Root').unwrap({ forwardPropsTo: 'Popover.Popup' }),
            code.jsx.element('Popover.Trigger').unwrap(),
            code.jsx.element('TooltipPrimitive.Root').unwrap({ forwardPropsTo: 'TooltipPrimitive.Popup' }),
            code.jsx.element('TooltipPrimitive.Trigger').unwrap(),
            code.jsx.element('Menu.Root').unwrap({ forwardPropsTo: 'Menu.Content' }),
            code.function('SettingsMenu').jsx.element('Menu.Group').unwrap(),
            code.function('SettingsMenu').jsx.element('Menu.Trigger').addProp('commandfor', 'settings-menu'),
            code.function('SettingsMenu').jsx.element('Menu.Trigger').replace('button'),
            code.function('SettingsMenu').jsx.element('Menu.Content').addProp('id', 'settings-menu'),
            ...submenuNames.flatMap((name) => {
              const component = `${name}SettingsMenu`;
              const id = submenuIds[name];
              return [
                code.function(component).jsx.element('Menu.Trigger').addProp('commandfor', id),
                code.function(component).jsx.element('Menu.Trigger').replace('media-menu-item'),
                code.function(component).jsx.element('Menu.Content').addProp('id', id),
              ];
            }),
            code.function('MuteButton').addProps([{ name: 'props', spread: true }]),
            code.jsx.element('MuteButtonPrimitive').spreadProps('props'),
            ...Object.entries(componentTags).map(([source, target]) => code.jsx.element(source).replace(target)),
            ...Object.entries(iconNames).flatMap(([source, name]) => [
              code.jsx.element(source).addProp('name', name),
              code.jsx.element(source).replace('media-icon'),
            ]),
            code.jsx
              .props('className')
              .on(/^[a-z]/)
              .replace(({ value }) => code.value.call(cn, [value])),
            code.jsx
              .props('className')
              .on(/^[a-z]/)
              .rename('class'),
            code
              .interface('ButtonTooltipProps')
              .property('children')
              .setType(() => code.type.unknown()),
          ];
        },
        { name: '@videojs/skins:html' }
      ),
    ],
  });
}

const markupElementModules = {
  'media-container': '@videojs/html/media/container',
  'media-poster': '@videojs/html/ui/poster',
} as const;

export function resolveHtmlElementImports(componentSymbols: readonly string[], markup = ''): string[] {
  const symbols = new Set(componentSymbols);
  const imports = new Set<string>();

  for (const symbol of symbols) {
    if (symbol === 'Slider' && (symbols.has('TimeSlider') || symbols.has('VolumeSlider'))) continue;
    for (const source of htmlComponents[symbol]?.modules ?? []) imports.add(source);
  }
  for (const [element, module] of Object.entries(markupElementModules)) {
    if (markup.includes(`<${element}`)) imports.add(module);
  }

  return [...imports].sort();
}
