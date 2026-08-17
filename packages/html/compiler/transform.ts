import { type CompilerTransform, createJsxEditor, type TransformHelpers } from '@videojs/compiler';
import { addSideEffectImport, isJsxElementLike, type JsxElementLike, tagName } from '@videojs/compiler/ast';
import {
  createTemplateRoot,
  extractTemplate,
  readTemplateName,
  type TemplateDefinition,
  templateError,
} from '@videojs/compiler/components';
import ts from 'typescript';

const templateDefinitions = [
  { name: 'chapter', parent: '$.TimeSlider.Chapters', rootTag: 'div' },
  { name: 'quality-option', parent: 'QualityRadioGroup', rootTag: undefined },
  { name: 'audio-track-option', parent: 'AudioTrackRadioGroup', rootTag: undefined },
  { name: 'playback-rate-option', parent: 'PlaybackRateRadioGroup', rootTag: undefined },
  { name: 'captions-option', parent: 'CaptionsRadioGroup', rootTag: undefined },
] as const satisfies readonly TemplateDefinition[];

interface TemplatePart {
  readonly name: 'selected-label' | 'label' | 'tier' | 'badge';
  readonly value: string;
  readonly tag: string;
}

/** Framework-owned transforms for compiler Template and Text primitives. */
export function createComponentTransforms(code: TransformHelpers) {
  return [...createTemplatePartTransforms(code), ...createTemplateTransforms(code), transformText()];
}

function createTemplatePartTransforms(code: TransformHelpers) {
  const parts: readonly TemplatePart[] = [
    { name: 'selected-label', value: 'hint', tag: 'span' },
    { name: 'label', value: 'label', tag: 'span' },
    { name: 'tier', value: 'tier', tag: 'sup' },
    { name: 'badge', value: 'badge', tag: 'span' },
  ];

  return [
    ...parts.map((part) =>
      code.jsx.element('Template.Part').replace(({ element, factory }) => lowerTemplatePart(element, part, factory))
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

function createTemplateTransforms(code: TransformHelpers) {
  return [
    ...templateDefinitions.map((template) =>
      code.jsx.element(template.parent).replace(({ element, factory }) => lowerTemplate(element, template, factory))
    ),
    code.jsx
      .element('Template')
      .replace(({ element }) =>
        templateError(element, `No HTML transform is configured for <Template name="${readTemplateName(element)}">.`)
      ),
  ];
}

function lowerTemplatePart(element: JsxElementLike, part: TemplatePart, factory: ts.NodeFactory): ts.Node {
  const jsx = createJsxEditor(factory);

  if (readTemplateName(element) !== part.name) return element;

  return jsx.apply(
    jsx.children.onlyElement(element),
    jsx.tag.replace(part.tag),
    jsx.props.set('data-part', part.value)
  );
}

function lowerTemplate(parent: JsxElementLike, template: TemplateDefinition, factory: ts.NodeFactory): JsxElementLike {
  const jsx = createJsxEditor(factory);
  const extracted = extractTemplate(parent, template.name, factory);

  if (!extracted) return parent;

  const root = createTemplateRoot(extracted.child, template.rootTag, factory);
  return jsx.apply(parent, jsx.children.replace(extracted.child, jsx.create.element('template', [root])));
}

function transformText(): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    return (sourceFile) => {
      let transformedText = false;

      const visit: ts.Visitor = (node) => {
        const next = ts.visitEachChild(node, visit, context);
        if (!isJsxElementLike(next) || tagName(next) !== 'Text') return next;

        transformedText = true;
        return lowerText(next, factory);
      };

      const transformed = ts.visitEachChild(sourceFile, visit, context);
      return transformedText ? addSideEffectImport(transformed, '@videojs/html/i18n', factory) : transformed;
    };
  };
}

function lowerText(element: JsxElementLike, factory: ts.NodeFactory): JsxElementLike {
  const jsx = createJsxEditor(factory);
  const expression = jsx.children.singleExpression(element);
  const descriptor = expression && ts.isIdentifier(expression) ? expression : undefined;

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
