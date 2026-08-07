import { type CompilerTransform, defineConfig, transform } from '@videojs/compiler';
import { byTag, replaceJsxChild } from '@videojs/compiler/ast';
import ts from 'typescript';

const componentTags = {
  'Controls.Root': 'media-controls',
  'Controls.Group': 'media-controls-group',
  FullscreenButtonPrimitive: 'media-fullscreen-button',
  MuteButtonPrimitive: 'media-mute-button',
  PlayButtonPrimitive: 'media-play-button',
  'Popover.Root': 'media-popover',
  'Popover.Popup': 'div',
  'Popover.Trigger': 'button',
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
  'TooltipPrimitive.Root': 'media-tooltip',
  'TooltipPrimitive.Popup': 'div',
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

const htmlSourceConfig = defineConfig({
  plugins: [
    transform(
      (code) => {
        const cn = code.import('@videojs/utils/style', 'cn');

        return [
          ...Object.entries(componentTags).map(([source, target]) => code.jsx.element(source).replace(target)),
          ...Object.entries(iconNames).flatMap(([source, name]) => [
            code.jsx.element(source).addProp('name', name),
            code.jsx.element(source).replace('media-icon'),
          ]),
          replaceJsxChild({
            match: byTag('TooltipPrimitive.Trigger'),
            replace: (element) => (ts.isJsxElement(element) ? element.children : undefined),
          }),
          code.jsx
            .props('className')
            .where(code.value.isArray())
            .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
          renameClassNameToClass(),
          removeCanonicalImports(),
        ];
      },
      { name: '@videojs/html:source-ui' }
    ),
  ],
});

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

function removeCanonicalImports(): CompilerTransform {
  const canonicalSources = new Set(['@videojs/core/components', '@videojs/icons/components']);

  return (context) => (sourceFile) =>
    context.factory.updateSourceFile(
      sourceFile,
      sourceFile.statements.filter(
        (statement) =>
          !(
            ts.isImportDeclaration(statement) &&
            ts.isStringLiteral(statement.moduleSpecifier) &&
            canonicalSources.has(statement.moduleSpecifier.text)
          )
      )
    );
}

function renameClassNameToClass(): CompilerTransform {
  return (context) => {
    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      const next = ts.visitEachChild(node, visit, context);
      if (!ts.isJsxAttribute(next) || !ts.isIdentifier(next.name) || next.name.text !== 'className') return next;
      return context.factory.updateJsxAttribute(next, context.factory.createIdentifier('class'), next.initializer);
    };
    return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };
}
