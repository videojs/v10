import { createJsxEditor, defineConfig, html, rewrite, type TransformHelpers } from '@videojs/compiler';
import type { JsxElementLike } from '@videojs/compiler/ast';
import { type StylePluginOptions, plugin as stylesPlugin } from '@videojs/compiler/styles';
import type ts from 'typescript';
import {
  createTemplateRoot,
  extractTemplate,
  readTemplateName,
  readTextDescriptor,
  type TemplateDefinition,
  type TemplatePartName,
  templateDefinitions,
  templateError,
} from './template';

interface CreateCompilerHtmlConfigOptions {
  styles?: StylePluginOptions | undefined;
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
    elements: { QualityRadioGroupPrimitive: 'media-quality-radio-group' },
  },
  AudioTrackRadioGroup: {
    modules: ['@videojs/html/ui/audio-track-radio-group'],
    elements: { AudioTrackRadioGroupPrimitive: 'media-audio-track-radio-group' },
  },
  PlaybackRateRadioGroup: {
    modules: ['@videojs/html/ui/playback-rate-radio-group'],
    elements: { PlaybackRateRadioGroupPrimitive: 'media-playback-rate-radio-group' },
  },
  CaptionsRadioGroup: {
    modules: ['@videojs/html/ui/captions-radio-group'],
    elements: { CaptionsRadioGroupPrimitive: 'media-captions-radio-group' },
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

const SETTINGS_SUBMENUS = [
  ['QualityMenu', 'settings-quality-menu'],
  ['AudioTrackMenu', 'settings-audio-menu'],
  ['PlaybackRateMenu', 'settings-speed-menu'],
  ['CaptionsMenu', 'settings-captions-menu'],
] as const;

/** Create the compiler policy for an HTML Skin target. */
export function createCompilerHtmlConfig(options: CreateCompilerHtmlConfigOptions) {
  const rootComponentName = options.rootComponentName ?? 'DefaultVideoSkin';
  return defineConfig({
    target: html({
      imports: {
        '@videojs/core/components': false,
        '@videojs/icons/components': false,
        '@videojs/jsx': false,
      },
    }),
    plugins: [
      ...(options.styles ? [stylesPlugin(options.styles)] : []),

      rewrite(
        (code) => {
          const cn = code.import('@videojs/utils/style', 'cn');
          const rootContainer = code.function(rootComponentName).jsx.element('Container');
          const containerPrimitiveClassName = code
            .function('Container')
            .jsx.props('className')
            .on('ContainerPrimitive');
          return [
            // Lower constrained canonical JSX before target element rewrites.
            ...createHtmlTemplatePartTransforms(code),
            ...createHtmlTemplateTransforms(code),

            // Establish the Skin root, component content slot, and Container API.
            rootContainer.addProp('className', () => {
              if (!options.rootClassName) {
                throw new Error('HTML Skin root transform requires `rootClassName`.');
              }
              return options.rootClassName;
            }),
            containerPrimitiveClassName.replace(({ value }) => code.value.array([value, 'className'])),
            code.function('Container').setProps(['children', 'className']),
            code.jsx.element('Slot').replace('slot'),

            // Target-neutral presentational roles become native HTML elements.
            code.jsx.element('ErrorDialogPrimitive.Root').unwrap(),
            code.jsx.element('OverlayRoot').replace('div'),
            code.jsx.element('StatusIndicatorGroup').replace('div'),
            code.jsx.element('PreviewValue').replace('div'),
            code.jsx.element('SubmenuHint').replace('span'),
            code.jsx.element('QualityOptionLabel').replace('span'),
            code.jsx.element('Text').replace(({ element, factory }) => lowerHtmlText(element, factory)),

            // Flatten compound target components into their HTML element protocols.
            code.jsx.element('Popover.Root').unwrap({ forwardPropsTo: 'Popover.Popup' }),
            code.jsx.element('Popover.Trigger').unwrap(),
            code.jsx.element('TooltipPrimitive.Root').unwrap({ forwardPropsTo: 'TooltipPrimitive.Popup' }),
            code.jsx.element('TooltipPrimitive.Trigger').unwrap(),
            code.jsx.element('Menu.Root').unwrap({ forwardPropsTo: 'Menu.Content' }),
            code.function('SettingsMenu').jsx.element('Menu.Group').unwrap(),
            code.function('SettingsMenu').jsx.element('Menu.Trigger').addProp('commandfor', 'settings-menu'),
            code.function('SettingsMenu').jsx.element('Menu.Trigger').addProp('id', 'settings-trigger'),
            code.function('SettingsMenu').jsx.element('Menu.Trigger').replace('button'),
            code.function('SettingsMenu').jsx.element('TooltipPrimitive.Popup').addProp('trigger', 'settings-trigger'),
            code.function('SettingsMenu').jsx.element('Menu.Content').addProp('id', 'settings-menu'),
            code.function('Submenu').setProps(['children', 'icon', 'label', 'selectedLabel', 'menuId']),
            code.function('Submenu').jsx.element('Menu.Trigger').addProp('commandfor', code.value.identifier('menuId')),
            code.function('Submenu').jsx.element('Menu.Trigger').replace('media-menu-item'),
            code.function('Submenu').jsx.element('Menu.Content').addProp('id', code.value.identifier('menuId')),
            ...SETTINGS_SUBMENUS.map(([component, id]) =>
              code.function(component).jsx.element('Submenu').addProp('menuId', id)
            ),

            // Forward authored props before mapping canonical components and icons.
            code.function('MuteButton').addProps([{ name: 'props', spread: true }]),
            code.jsx.element('MuteButtonPrimitive').spreadProps('props'),
            ...Object.entries(componentTags).map(([source, target]) => code.jsx.element(source).replace(target)),
            ...Object.entries(iconNames).flatMap(([source, name]) => [
              code.jsx.element(source).addProp('name', name),
              code.jsx.element(source).replace('media-icon'),
            ]),

            // Compose class arrays, then emit native HTML attribute and child types.
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

interface HtmlTemplatePart {
  name: TemplatePartName;
  value: string;
  tag: string;
}

function createHtmlTemplatePartTransforms(code: TransformHelpers) {
  const parts: readonly HtmlTemplatePart[] = [
    { name: 'selected-label', value: 'hint', tag: 'span' },
    { name: 'label', value: 'label', tag: 'span' },
    { name: 'tier', value: 'tier', tag: 'sup' },
    { name: 'badge', value: 'badge', tag: 'span' },
  ];

  return [
    ...parts.map((part) =>
      code.jsx.element('Template.Part').replace(({ element, factory }) => lowerHtmlTemplatePart(element, part, factory))
    ),
    code.jsx
      .element('Template.Part')
      .replace(({ element }) =>
        templateError(
          element,
          `No HTML transform is configured for <Template.Part name="${readTemplateName(element)}">.`
        )
      ),
  ];
}

function createHtmlTemplateTransforms(code: TransformHelpers) {
  return [
    ...templateDefinitions.map((template) =>
      code.jsx.element(template.parent).replace(({ element, factory }) => lowerHtmlTemplate(element, template, factory))
    ),
    code.jsx
      .element('Template')
      .replace(({ element }) =>
        templateError(element, `No HTML transform is configured for <Template name="${readTemplateName(element)}">.`)
      ),
  ];
}

function lowerHtmlTemplatePart(element: JsxElementLike, part: HtmlTemplatePart, factory: ts.NodeFactory): ts.Node {
  const jsx = createJsxEditor(factory);
  if (readTemplateName(element) !== part.name) return element;
  return jsx.apply(
    jsx.children.onlyElement(element),
    jsx.tag.replace(part.tag),
    jsx.props.set('data-part', part.value)
  );
}

function lowerHtmlTemplate(
  parent: JsxElementLike,
  template: TemplateDefinition,
  factory: ts.NodeFactory
): JsxElementLike {
  const jsx = createJsxEditor(factory);
  const extracted = extractTemplate(parent, template.name, factory);
  if (!extracted) return parent;
  const authored = extracted.child;
  const root = createTemplateRoot(authored, template.rootTag, factory);
  return jsx.apply(parent, jsx.children.replace(authored, jsx.create.element('template', [root])));
}

function lowerHtmlText(element: JsxElementLike, factory: ts.NodeFactory): JsxElementLike {
  const jsx = createJsxEditor(factory);
  const descriptor = readTextDescriptor(element);
  return jsx.apply(
    element,
    jsx.tag.replace('media-text'),
    ...(descriptor
      ? [
          jsx.props.set('token', factory.createPropertyAccessExpression(descriptor, 'key')),
          jsx.children.set([jsx.create.expression(factory.createPropertyAccessExpression(descriptor, 'text'))]),
        ]
      : [])
  );
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
