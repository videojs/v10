import { defineConfig, jsx, transform } from '@videojs/compiler';
import type { StyleProgram } from '@videojs/compiler/tailwind';
import { tailwind } from '@videojs/compiler/tailwind';

export type SkinSourceStyle = 'css' | 'tailwind';

export interface CreateHtmlSkinSourceConfigOptions {
  style: SkinSourceStyle;
  tailwindInput?: string | undefined;
  styleProgram?: StyleProgram | undefined;
}

const componentTags = {
  'Controls.Root': 'media-controls',
  'Controls.Group': 'media-controls-group',
  FullscreenButtonPrimitive: 'media-fullscreen-button',
  MuteButtonPrimitive: 'media-mute-button',
  PlayButtonPrimitive: 'media-play-button',
  'Popover.Popup': 'media-popover',
  SeekButtonPrimitive: 'media-seek-button',
  'Slider.Thumbnail.Root': 'div',
  'Slider.Thumbnail.Image': 'media-slider-thumbnail',
  Text: 'span',
  'TimePrimitive.Value': 'media-time',
  'TimeSliderPrimitive.Root': 'media-time-slider',
  'TimeSliderPrimitive.Track': 'media-slider-track',
  'TimeSliderPrimitive.Fill': 'media-slider-fill',
  'TimeSliderPrimitive.Buffer': 'media-slider-buffer',
  'TimeSliderPrimitive.Thumb': 'media-slider-thumb',
  'TimeSliderPrimitive.Preview': 'media-slider-preview',
  'TimeSliderPrimitive.Value': 'media-slider-value',
  'Tooltip.Provider': 'media-tooltip-group',
  'TooltipPrimitive.Popup': 'media-tooltip',
  'TooltipPrimitive.Label': 'media-tooltip-label',
  'TooltipPrimitive.Shortcut': 'media-tooltip-shortcut',
  'VolumeSliderPrimitive.Root': 'media-volume-slider',
  'VolumeSliderPrimitive.Track': 'media-slider-track',
  'VolumeSliderPrimitive.Fill': 'media-slider-fill',
  'VolumeSliderPrimitive.Thumb': 'media-slider-thumb',
} as const;

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

const elementModules: Readonly<Record<string, readonly string[]>> = {
  Controls: ['@videojs/html/ui/controls'],
  FullscreenButton: ['@videojs/html/ui/fullscreen-button'],
  MuteButton: ['@videojs/html/ui/mute-button'],
  PlayButton: ['@videojs/html/ui/play-button'],
  Popover: ['@videojs/html/ui/popover'],
  SeekButton: ['@videojs/html/ui/seek-button'],
  Slider: ['@videojs/html/ui/slider'],
  Time: ['@videojs/html/ui/time'],
  TimeSlider: ['@videojs/html/ui/time-slider'],
  Tooltip: ['@videojs/html/ui/tooltip', '@videojs/html/ui/tooltip-group'],
  VolumeSlider: ['@videojs/html/ui/volume-slider'],
};

export function createHtmlSkinSourceConfig({ style, tailwindInput, styleProgram }: CreateHtmlSkinSourceConfigOptions) {
  return defineConfig({
    target: jsx({
      imports: {
        '@videojs/core/components': false,
        '@videojs/icons/components': false,
        '@videojs/jsx': false,
      },
    }),
    plugins: [
      tailwind(
        style === 'tailwind'
          ? { mode: 'inline' }
          : {
              mode: 'extract',
              ...(styleProgram
                ? { program: styleProgram }
                : { input: requiredTailwindInput(tailwindInput), output: 'styles.css' }),
              resolve: {
                element: ({ defaultName }) => ({ className: `media-${defaultName}` }),
              },
              ...(styleProgram ? {} : { emit: { tailwindVariables: 'inline', themeSelector: '.media-skin' } }),
            }
      ),
      transform(
        (code) => {
          const cn = code.import('@videojs/utils/style', 'cn');

          return [
            code.jsx.element('Popover.Root').unwrap({ forwardPropsTo: 'Popover.Popup' }),
            code.jsx.element('Popover.Trigger').unwrap(),
            code.jsx.element('TooltipPrimitive.Root').unwrap({ forwardPropsTo: 'TooltipPrimitive.Popup' }),
            code.jsx.element('TooltipPrimitive.Trigger').unwrap(),
            ...Object.entries(componentTags).map(([source, target]) => code.jsx.element(source).replace(target)),
            ...Object.entries(iconNames).flatMap(([source, name]) => [
              code.jsx.element(source).addProp('name', name),
              code.jsx.element(source).replace('media-icon'),
            ]),
            code.jsx.props('className').replace(({ value }) => code.value.call(cn, [value])),
            code.jsx.props('className').rename('class'),
            code
              .interface('ButtonTooltipProps')
              .property('children')
              .setType(() => code.type.unknown()),
          ];
        },
        { name: '@videojs/html:source-ui' }
      ),
    ],
  });
}

function requiredTailwindInput(input: string | undefined): string {
  if (!input) throw new Error('HTML vanilla CSS source generation requires a Tailwind input file.');
  return input;
}

const htmlSourceConfig = createHtmlSkinSourceConfig({ style: 'tailwind' });

export default htmlSourceConfig;

export function resolveHtmlElementImports(componentSymbols: readonly string[]): string[] {
  const symbols = new Set(componentSymbols);
  const imports = new Set<string>();

  for (const symbol of symbols) {
    if (symbol === 'Slider' && (symbols.has('TimeSlider') || symbols.has('VolumeSlider'))) continue;
    for (const source of elementModules[symbol] ?? []) imports.add(source);
  }

  return [...imports].sort();
}
