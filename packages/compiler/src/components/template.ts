import ts from 'typescript';

import { DiagnosticError, diagnosticLocationFromNode } from '../diagnostics';
import { createJsxEditor } from '../jsx/editor';
import type { JsxElementLike } from '../utils/jsx';

export interface TemplateDefinition<Name extends string = string> {
  readonly name: Name;
  readonly parent: string;
  readonly rootTag?: string | undefined;
}

export function extractTemplate(parent: JsxElementLike, name: string, factory: ts.NodeFactory) {
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
