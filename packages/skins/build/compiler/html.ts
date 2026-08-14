import { defineConfig, html, rewrite } from '@videojs/compiler';
import type { SkinStyleManifest } from '../styles/manifest';
import { type SkinStyleTarget, skinStyles } from '../styles/transform';

interface CreateCompilerHtmlConfigOptions {
  style: SkinStyleTarget;
  styles: SkinStyleManifest;
  rootClassName?: string | undefined;
}

interface HtmlComponentDescriptor {
  modules: readonly string[];
  elements: Readonly<Record<string, string>>;
}

const htmlComponents: Readonly<Record<string, HtmlComponentDescriptor>> = {
  Container: {
    modules: ['@videojs/html/media/container'],
    elements: { ContainerPrimitive: 'media-container' },
  },
  Controls: {
    modules: ['@videojs/html/ui/controls'],
    elements: { 'Controls.Root': 'media-controls', 'Controls.Group': 'media-controls-group' },
  },
  FullscreenButton: {
    modules: ['@videojs/html/ui/fullscreen-button'],
    elements: { FullscreenButtonPrimitive: 'media-fullscreen-button' },
  },
  MuteButton: {
    modules: ['@videojs/html/ui/mute-button'],
    elements: { MuteButtonPrimitive: 'media-mute-button' },
  },
  PlayButton: {
    modules: ['@videojs/html/ui/play-button'],
    elements: { PlayButtonPrimitive: 'media-play-button' },
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
  Slider: {
    modules: ['@videojs/html/ui/slider'],
    elements: {
      'Slider.Thumbnail.Root': 'div',
      'Slider.Thumbnail.Image': 'media-slider-thumbnail',
    },
  },
  Text: { modules: [], elements: { Text: 'span' } },
  Time: {
    modules: ['@videojs/html/ui/time'],
    elements: { 'TimePrimitive.Value': 'media-time' },
  },
  TimeSlider: {
    modules: ['@videojs/html/ui/time-slider'],
    elements: {
      'TimeSliderPrimitive.Root': 'media-time-slider',
      'TimeSliderPrimitive.Track': 'media-slider-track',
      'TimeSliderPrimitive.Fill': 'media-slider-fill',
      'TimeSliderPrimitive.Buffer': 'media-slider-buffer',
      'TimeSliderPrimitive.Thumb': 'media-slider-thumb',
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
};

const componentTags = Object.fromEntries(
  Object.values(htmlComponents).flatMap(({ elements }) => Object.entries(elements))
);

const iconNames = {
  FullscreenEnterIcon: 'fullscreen-enter',
  FullscreenExitIcon: 'fullscreen-exit',
  PauseIcon: 'pause',
  PlayIcon: 'play',
  RestartIcon: 'restart',
  SeekIcon: 'seek',
  SpinnerIcon: 'spinner',
  VolumeHighIcon: 'volume-high',
  VolumeLowIcon: 'volume-low',
  VolumeOffIcon: 'volume-off',
} as const;

/** Create the compiler policy for an HTML Skin projection. */
export function createCompilerHtmlConfig(styleTarget: CreateCompilerHtmlConfigOptions) {
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
      rewrite(
        (code) => {
          const cn = code.import('@videojs/utils/style', 'cn');
          const rootContainer = code.function('DefaultVideoSkin').jsx.element('Container');
          const containerPrimitiveClassName = code
            .function('Container')
            .jsx.props('className')
            .on('ContainerPrimitive');

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
            code.jsx.element('OverlayPrimitive').replace('div'),
            code.jsx.element('Popover.Root').unwrap({ forwardPropsTo: 'Popover.Popup' }),
            code.jsx.element('Popover.Trigger').unwrap(),
            code.jsx.element('TooltipPrimitive.Root').unwrap({ forwardPropsTo: 'TooltipPrimitive.Popup' }),
            code.jsx.element('TooltipPrimitive.Trigger').unwrap(),
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
