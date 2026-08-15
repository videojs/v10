import ts from 'typescript';
import type { CompilerTransform } from '../../config';
import { DiagnosticError, diagnosticLocationFromNode } from '../../diagnostics';
import {
  findJsxAttribute,
  isJsxElementLike,
  type JsxElementLike,
  jsxAttributes,
  readStringAttribute,
} from '../../utils/jsx';
import { tagName } from '../matchers/tag';

export interface TemplateElementLowering {
  kind: 'element';
  /** Element containing the repeated root. */
  templateTag?: string | undefined;
  /** Concrete root created for each repeated item. */
  rootTag: string;
}

export interface TemplateRenderPropLowering {
  kind: 'render-prop';
  /** Prop receiving the repeated-item render callback. */
  prop: string;
  /** Concrete root returned by the callback. */
  rootTag: string;
  /** Callback parameter spread onto the repeated root. */
  parameter?: string | undefined;
}

export type TemplateLowering = (TemplateElementLowering | TemplateRenderPropLowering) & {
  /** Required direct parent tag for this template. */
  parent: string | RegExp;
};

export interface LowerTemplatesOptions {
  /** Canonical template component tag. Defaults to `Template`. */
  tag?: string | undefined;
  /** Lowering configuration keyed by static Template name. */
  templates: Readonly<Record<string, TemplateLowering>>;
}

interface TemplateReference {
  element: ts.JsxElement;
  name: string;
  lowering: TemplateLowering;
}

/** Lower statically named canonical templates to target repetition constructs. */
export function lowerTemplates(options: LowerTemplatesOptions): CompilerTransform {
  const templateTag = options.tag ?? 'Template';

  return (context) => {
    const factory = context.factory;

    return (sourceFile) => {
      validateTemplates(sourceFile, templateTag, options.templates);

      const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
        const next = ts.visitEachChild(node, visit, context);

        if (ts.isJsxElement(next) && tagName(next) === templateTag) {
          const reference = readTemplate(next, options.templates);
          if (reference.lowering.kind === 'element') return createTemplateElement(reference, factory);
        }

        if (!ts.isJsxElement(next)) return next;
        return lowerRenderPropTemplates(next, templateTag, options.templates, factory);
      };

      return ts.visitEachChild(sourceFile, visit, context);
    };
  };
}

function validateTemplates(
  sourceFile: ts.SourceFile,
  templateTag: string,
  templates: Readonly<Record<string, TemplateLowering>>
): void {
  const scopes: Array<Set<string>> = [];

  const visit = (node: ts.Node, jsxParent?: JsxElementLike): void => {
    const opensScope = ts.isFunctionLike(node);
    if (opensScope) scopes.push(new Set());

    if (isJsxElementLike(node) && tagName(node) === templateTag) {
      if (!ts.isJsxElement(node)) fail(node, '<Template> must contain an authored repeated root subtree.');
      const reference = readTemplate(node, templates);
      const scope = scopes.at(-1);
      if (!scope) fail(node, '<Template> must be declared inside a function.');
      if (scope.has(reference.name)) {
        fail(node, `Duplicate <Template name="${reference.name}"> in the same function.`);
      }
      scope.add(reference.name);
      if (!jsxParent || !matchesTag(tagName(jsxParent), reference.lowering.parent)) {
        fail(
          node,
          `<Template name="${reference.name}"> must be a direct child of ${describeTag(reference.lowering.parent)}.`
        );
      }
    }

    const nextJsxParent = isJsxElementLike(node) ? node : jsxParent;
    ts.forEachChild(node, (child) => visit(child, nextJsxParent));
    if (opensScope) scopes.pop();
  };

  visit(sourceFile);
}

function readTemplate(
  element: ts.JsxElement,
  templates: Readonly<Record<string, TemplateLowering>>
): TemplateReference {
  const name = readStringAttribute(element.openingElement.attributes, 'name');
  if (name === undefined) fail(element, '<Template> requires a static `name` prop.');
  if (name === null || name.length === 0) fail(element, '<Template name> must be a non-empty string literal.');
  const lowering = templates[name];
  if (!lowering) fail(element, `No target lowering is configured for <Template name="${name}">.`);
  return { element, name, lowering };
}

function lowerRenderPropTemplates(
  parent: ts.JsxElement,
  templateTag: string,
  templates: Readonly<Record<string, TemplateLowering>>,
  factory: ts.NodeFactory
): ts.JsxElement {
  const references = parent.children
    .filter((child): child is ts.JsxElement => ts.isJsxElement(child) && tagName(child) === templateTag)
    .map((element) => readTemplate(element, templates))
    .filter((reference) => reference.lowering.kind === 'render-prop');
  if (references.length === 0) return parent;

  let attributes = parent.openingElement.attributes;
  for (const reference of references) {
    const lowering = reference.lowering as TemplateLowering & TemplateRenderPropLowering;
    if (findJsxAttribute(attributes, lowering.prop)) {
      fail(parent, `${describeTag(lowering.parent)} already declares the \`${lowering.prop}\` template prop.`);
    }
    const parameter = lowering.parameter ?? 'props';
    const root = createRoot(reference.element, lowering.rootTag, factory, parameter);
    const callback = factory.createArrowFunction(
      undefined,
      undefined,
      [factory.createParameterDeclaration(undefined, undefined, parameter)],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createParenthesizedExpression(root)
    );
    attributes = factory.updateJsxAttributes(attributes, [
      ...attributes.properties,
      factory.createJsxAttribute(
        factory.createIdentifier(lowering.prop),
        factory.createJsxExpression(undefined, callback)
      ),
    ]);
  }

  const removed = new Set(references.map(({ element }) => element));
  return factory.updateJsxElement(
    parent,
    factory.updateJsxOpeningElement(
      parent.openingElement,
      parent.openingElement.tagName,
      parent.openingElement.typeArguments,
      attributes
    ),
    parent.children.filter((child) => !removed.has(child as ts.JsxElement)),
    parent.closingElement
  );
}

function createTemplateElement(reference: TemplateReference, factory: ts.NodeFactory): ts.JsxElement {
  const lowering = reference.lowering as TemplateElementLowering;
  const root = createRoot(reference.element, lowering.rootTag, factory);
  const tag = factory.createIdentifier(lowering.templateTag ?? 'template');
  return factory.createJsxElement(
    factory.createJsxOpeningElement(tag, undefined, factory.createJsxAttributes([])),
    [root],
    factory.createJsxClosingElement(tag)
  );
}

function createRoot(template: ts.JsxElement, rootTag: string, factory: ts.NodeFactory, spread?: string): ts.JsxElement {
  const attributes = jsxAttributes(template).properties.filter(
    (property) => !(ts.isJsxAttribute(property) && property.name.getText() === 'name')
  );
  const rootAttributes = factory.createJsxAttributes([
    ...(spread ? [factory.createJsxSpreadAttribute(factory.createIdentifier(spread))] : []),
    ...attributes,
  ]);
  const tag = factory.createIdentifier(rootTag);
  return factory.createJsxElement(
    factory.createJsxOpeningElement(tag, undefined, rootAttributes),
    template.children,
    factory.createJsxClosingElement(tag)
  );
}

function matchesTag(value: string, expected: string | RegExp): boolean {
  return typeof expected === 'string' ? value === expected : expected.test(value);
}

function describeTag(tag: string | RegExp): string {
  return typeof tag === 'string' ? `<${tag}>` : `a parent matching ${tag}`;
}

function fail(node: ts.Node, message: string): never {
  throw new DiagnosticError(message, {
    ...diagnosticLocationFromNode(node),
    diagnosticCode: 'jsx-template-invalid',
  });
}
