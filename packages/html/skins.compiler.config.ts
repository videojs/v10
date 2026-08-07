import { type CompilerTransform, defineConfig, transform } from '@videojs/compiler';
import { tagName } from '@videojs/compiler/ast';
import ts from 'typescript';

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

const htmlSourceConfig = defineConfig({
  plugins: [
    transform(
      (code) => {
        const cn = code.import('@videojs/utils/style', 'cn');
        const TooltipProps = code.type.named(code.import('@videojs/core', 'TooltipProps', { type: true }));

        return [
          flattenPopupCompound('Popover.Root', 'Popover.Trigger', 'Popover.Popup'),
          flattenPopupCompound('TooltipPrimitive.Root', 'TooltipPrimitive.Trigger', 'TooltipPrimitive.Popup'),
          ...Object.entries(componentTags).map(([source, target]) => code.jsx.element(source).replace(target)),
          ...Object.entries(iconNames).flatMap(([source, name]) => [
            code.jsx.element(source).addProp('name', name),
            code.jsx.element(source).replace('media-icon'),
          ]),
          code.jsx
            .props('className')
            .where(code.value.isArray())
            .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
          replaceCanonicalTooltipProps(TooltipProps),
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

function flattenPopupCompound(rootTag: string, triggerTag: string, popupTag: string): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      const next = ts.visitEachChild(node, visit, context);
      if (!ts.isJsxElement(next) || tagName(next) !== rootTag) return next;

      let foundPopup = false;
      const children = next.children.flatMap((child): readonly ts.JsxChild[] => {
        if (!ts.isJsxElement(child)) return [child];
        if (tagName(child) === triggerTag) return child.children;
        if (tagName(child) !== popupTag) return [child];

        foundPopup = true;
        const attributes = factory.updateJsxAttributes(child.openingElement.attributes, [
          ...next.openingElement.attributes.properties,
          ...child.openingElement.attributes.properties,
        ]);

        return [
          factory.updateJsxElement(
            child,
            factory.updateJsxOpeningElement(
              child.openingElement,
              child.openingElement.tagName,
              child.openingElement.typeArguments,
              attributes
            ),
            child.children,
            child.closingElement
          ),
        ];
      });

      if (!foundPopup) return next;
      return factory.createJsxFragment(
        factory.createJsxOpeningFragment(),
        children,
        factory.createJsxJsxClosingFragment()
      );
    };

    return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };
}

function replaceCanonicalTooltipProps(tooltipProps: ts.TypeNode): CompilerTransform {
  return (context) => {
    const factory = context.factory;
    const replacement = factory.createIntersectionTypeNode([
      tooltipProps,
      factory.createTypeLiteralNode([
        factory.createPropertySignature(
          undefined,
          'children',
          factory.createToken(ts.SyntaxKind.QuestionToken),
          factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
        ),
      ]),
    ]);

    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (isCanonicalTooltipProps(node)) return replacement;
      return ts.visitEachChild(node, visit, context);
    };

    return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };
}

function isCanonicalTooltipProps(node: ts.Node): node is ts.IndexedAccessTypeNode {
  if (!ts.isIndexedAccessTypeNode(node) || !ts.isTypeReferenceNode(node.objectType)) return false;
  if (!ts.isIdentifier(node.objectType.typeName) || node.objectType.typeName.text !== 'Parameters') return false;
  if (node.objectType.typeArguments?.length !== 1) return false;

  const parameter = node.objectType.typeArguments[0];
  if (!ts.isTypeQueryNode(parameter) || !ts.isQualifiedName(parameter.exprName)) return false;
  if (!ts.isIdentifier(parameter.exprName.left) || parameter.exprName.left.text !== 'TooltipPrimitive') return false;
  if (parameter.exprName.right.text !== 'Root') return false;

  return (
    ts.isLiteralTypeNode(node.indexType) &&
    ts.isNumericLiteral(node.indexType.literal) &&
    node.indexType.literal.text === '0'
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
