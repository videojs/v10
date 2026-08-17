import { createJsxEditor, DiagnosticError, diagnosticLocationFromNode } from '@videojs/compiler';
import type { JsxElementLike } from '@videojs/compiler/ast';
import ts from 'typescript';

export const templatePartNames = ['selected-label', 'label', 'tier', 'badge'] as const;

export type TemplatePartName = (typeof templatePartNames)[number];

export const templateDefinitions = [
  { name: 'chapter', parent: 'TimeSliderPrimitive.Chapters', rootTag: 'div' },
  { name: 'quality-option', parent: 'QualityRadioGroup', rootTag: undefined },
  { name: 'audio-track-option', parent: 'AudioTrackRadioGroup', rootTag: undefined },
  { name: 'playback-rate-option', parent: 'PlaybackRateRadioGroup', rootTag: undefined },
  { name: 'captions-option', parent: 'CaptionsRadioGroup', rootTag: undefined },
] as const;

export type TemplateDefinition = (typeof templateDefinitions)[number];
export type TemplateName = TemplateDefinition['name'];

export function extractTemplate(parent: JsxElementLike, name: TemplateName, factory: ts.NodeFactory) {
  const jsx = createJsxEditor(factory);

  return jsx.children.extractOne(
    parent,
    (child) => jsx.tag.name(child) === 'Template' && readTemplateName(child) === name
  );
}

export function createTemplateRoot(
  authored: JsxElementLike,
  rootTag: string | undefined,
  factory: ts.NodeFactory
): JsxElementLike {
  const jsx = createJsxEditor(factory);

  return rootTag
    ? jsx.apply(authored, jsx.props.remove('name'), jsx.tag.replace(rootTag))
    : jsx.children.onlyElement(authored);
}

export function readTemplateName(element: JsxElementLike): string {
  const jsx = createJsxEditor(ts.factory);
  const name = jsx.props.staticString(element, 'name');

  if (name === undefined) templateError(element, `<${jsx.tag.name(element)}> requires a static \`name\` prop.`);

  if (name === null || name.length === 0) {
    templateError(element, `<${jsx.tag.name(element)} name> must be a string literal.`);
  }

  return name;
}

export function templateError(node: ts.Node, message: string): never {
  throw new DiagnosticError(message, {
    ...diagnosticLocationFromNode(node),
    diagnosticCode: 'jsx-template-invalid',
  });
}

const textDescriptors = new Set(['settingsText', 'qualityText', 'audioText', 'speedText', 'captionsText']);

export function readTextDescriptor(element: JsxElementLike): ts.Identifier | undefined {
  const child = createJsxEditor(ts.factory).children.singleExpression(element);

  return child && ts.isIdentifier(child) && textDescriptors.has(child.text) ? child : undefined;
}
