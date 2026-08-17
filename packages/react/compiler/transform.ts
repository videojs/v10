import { createJsxEditor, type TransformHelpers } from '@videojs/compiler';
import { hasJsxAttribute, type JsxElementLike } from '@videojs/compiler/ast';
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

type TemplateName = (typeof templateDefinitions)[number]['name'];

interface TemplatePart {
  readonly name: 'selected-label' | 'label' | 'tier' | 'badge';
  readonly root: string;
  readonly property?: string | undefined;
  readonly optionalAccess?: boolean | undefined;
  readonly optional?: boolean | undefined;
  readonly tag?: string | undefined;
}

type ReactTemplate = (typeof templateDefinitions)[number] & {
  readonly prop: string;
  readonly parameters: readonly string[];
};

/** Framework-owned transforms for compiler Template and Text primitives. */
export function createComponentTransforms(code: TransformHelpers) {
  return [
    ...createTemplatePartTransforms(code),
    ...createTemplateTransforms(code),
    code.jsx.element('Text').replace(({ element, factory }) => lowerText(element, factory)),
  ];
}

function createTemplatePartTransforms(code: TransformHelpers) {
  const selectedLabelParts: ReadonlyArray<TemplatePart & { scope: string }> = [
    { scope: 'QualityMenu', name: 'selected-label', root: 'quality', property: 'selectedLabel', optionalAccess: true },
    {
      scope: 'AudioTrackMenu',
      name: 'selected-label',
      root: 'audioTrack',
      property: 'selectedLabel',
      optionalAccess: true,
    },
    {
      scope: 'PlaybackRateMenu',
      name: 'selected-label',
      root: 'playbackRate',
      property: 'selectedLabel',
      optionalAccess: true,
    },
    {
      scope: 'CaptionsMenu',
      name: 'selected-label',
      root: 'captions',
      property: 'selectedLabel',
      optionalAccess: true,
    },
  ];
  const itemParts: readonly TemplatePart[] = [
    { name: 'label', root: 'item', property: 'label' },
    { name: 'tier', root: 'item', property: 'tier', optional: true, tag: 'sup' },
    { name: 'badge', root: 'item', property: 'badge', optional: true },
  ];

  return [
    ...selectedLabelParts.map(({ scope, ...part }) =>
      code
        .function(scope)
        .jsx.element('Template.Part')
        .replace(({ element, factory }) => lowerTemplatePart(element, part, factory))
    ),
    ...itemParts.map((part) =>
      code.jsx.element('Template.Part').replace(({ element, factory }) => lowerTemplatePart(element, part, factory))
    ),
    code.jsx
      .element('Template.Part')
      .replace(({ element }) =>
        templateError(
          element,
          `No React transform is configured for <Template.Part name="${readTemplateName(element)}">.`
        )
      ),
  ];
}

function createTemplateTransforms(code: TransformHelpers) {
  const options = {
    chapter: { prop: 'renderChapter', parameters: ['props'] },
    'quality-option': { prop: 'renderItem', parameters: ['props', 'item'] },
    'audio-track-option': { prop: 'renderItem', parameters: ['props', 'item'] },
    'playback-rate-option': { prop: 'renderItem', parameters: ['props', 'item'] },
    'captions-option': { prop: 'renderItem', parameters: ['props', 'item'] },
  } as const satisfies Record<TemplateName, Pick<ReactTemplate, 'prop' | 'parameters'>>;
  const templates: readonly ReactTemplate[] = templateDefinitions.map((template) => ({
    ...template,
    ...options[template.name],
  }));

  return [
    ...templates.map((template) =>
      code.jsx.element(template.parent).replace(({ element, factory }) => lowerTemplate(element, template, factory))
    ),
    code.jsx
      .element('Template')
      .replace(({ element }) =>
        templateError(element, `No React transform is configured for <Template name="${readTemplateName(element)}">.`)
      ),
  ];
}

function lowerTemplatePart(element: JsxElementLike, part: TemplatePart, factory: ts.NodeFactory): ts.Node {
  const jsx = createJsxEditor(factory);

  if (readTemplateName(element) !== part.name) return element;

  let rendered = jsx.children.onlyElement(element);
  if (part.tag) rendered = jsx.apply(rendered, jsx.tag.replace(part.tag));

  const root = factory.createIdentifier(part.root);
  const value = part.property
    ? part.optionalAccess
      ? factory.createPropertyAccessChain(root, factory.createToken(ts.SyntaxKind.QuestionDotToken), part.property)
      : factory.createPropertyAccessExpression(root, part.property)
    : root;

  rendered = jsx.apply(rendered, jsx.children.set([jsx.create.expression(value)]));

  return part.optional
    ? factory.createJsxExpression(
        undefined,
        factory.createConditionalExpression(
          value,
          factory.createToken(ts.SyntaxKind.QuestionToken),
          rendered,
          factory.createToken(ts.SyntaxKind.ColonToken),
          factory.createNull()
        )
      )
    : rendered;
}

function lowerTemplate(parent: JsxElementLike, template: ReactTemplate, factory: ts.NodeFactory): JsxElementLike {
  const jsx = createJsxEditor(factory);
  const extracted = extractTemplate(parent, template.name, factory);

  if (!extracted) return parent;

  const attributes = ts.isJsxElement(parent) ? parent.openingElement.attributes : parent.attributes;
  if (hasJsxAttribute(attributes, template.prop)) {
    templateError(parent, `<${template.parent}> already declares \`${template.prop}\`.`);
  }

  const root = createTemplateRoot(extracted.child, template.rootTag, factory);
  const rendered = jsx.apply(root, jsx.props.spread(factory.createIdentifier(template.parameters[0]!), 'start'));
  const callback = factory.createArrowFunction(
    undefined,
    undefined,
    template.parameters.map((name) => factory.createParameterDeclaration(undefined, undefined, name)),
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    factory.createParenthesizedExpression(rendered)
  );

  return jsx.apply(
    parent,
    jsx.props.set(template.prop, callback),
    jsx.children.set(extracted.rest),
    jsx.selfCloseIfEmpty()
  );
}

function lowerText(element: JsxElementLike, factory: ts.NodeFactory): JsxElementLike {
  const jsx = createJsxEditor(factory);
  const expression = jsx.children.singleExpression(element);
  const descriptor = expression && ts.isIdentifier(expression) ? expression : undefined;

  return jsx.apply(
    element,
    jsx.tag.replace('span'),
    ...(descriptor
      ? [
          jsx.children.set([
            jsx.create.expression(factory.createCallExpression(factory.createIdentifier('t'), undefined, [descriptor])),
          ]),
        ]
      : [])
  );
}
