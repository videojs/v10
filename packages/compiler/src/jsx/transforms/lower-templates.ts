import ts from 'typescript';
import type { CompilerTransform } from '../../config';
import { DiagnosticError, diagnosticLocationFromNode } from '../../diagnostics';
import {
  findJsxAttribute,
  isJsxElementLike,
  type JsxElementLike,
  jsxAttributes,
  readStringAttribute,
  singleJsxElementChild,
  updateJsxAttributes,
} from '../../utils/jsx';
import { tagName } from '../matchers/tag';

export interface TemplateElementLowering {
  kind: 'element';
  /** Element containing the repeated root. */
  templateTag?: string | undefined;
  /** Concrete generated root. Omit to use the Template's single element child. */
  rootTag?: string | undefined;
}

export interface TemplateRenderPropLowering {
  kind: 'render-prop';
  /** Prop receiving the repeated-item render callback. */
  prop: string;
  /** Concrete generated root. Omit to use the Template's single element child. */
  rootTag?: string | undefined;
  /** Callback parameters. The first parameter is spread onto the repeated root. */
  parameters?: readonly string[] | undefined;
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

export interface TemplatePartValueLowering {
  kind: 'value';
  /** Callback or hook result containing the target value. */
  root: string;
  /** Property read from the root. Omit to use the root value itself. */
  property?: string | undefined;
  /** Use optional property access. */
  optionalAccess?: boolean | undefined;
  /** Omit the authored child when the resolved value is absent. */
  optional?: boolean | undefined;
  /** Replace the authored child tag while preserving its props. */
  tag?: string | undefined;
}

export interface TemplatePartAttributeLowering {
  kind: 'attribute';
  attribute: string;
  value: string;
  /** Replace the authored child tag while preserving its props. */
  tag?: string | undefined;
}

export type TemplatePartLowering = TemplatePartValueLowering | TemplatePartAttributeLowering;

export interface LowerTemplatePartsOptions {
  /** Canonical Template.Part tag. Defaults to `Template.Part`. */
  tag?: string | undefined;
  /** Lowering keyed by `template-name:part-name` or `function-name:part-name`. */
  parts: Readonly<Record<string, TemplatePartLowering>>;
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

/** Lower named Template.Part outlets to target values or metadata attributes. */
export function lowerTemplateParts(options: LowerTemplatePartsOptions): CompilerTransform {
  const partTag = options.tag ?? 'Template.Part';

  return (context) => {
    const factory = context.factory;

    return (sourceFile) => {
      const seen = new Set<string>();

      const visit = (
        node: ts.Node,
        functionName?: string,
        templateName?: string
      ): ts.VisitResult<ts.Node | undefined> => {
        const nextFunctionName = ts.isFunctionDeclaration(node) && node.name ? node.name.text : functionName;
        const nextTemplateName =
          ts.isJsxElement(node) && tagName(node) === 'Template' ? readRequiredName(node, 'Template') : templateName;
        const next = ts.visitEachChild(node, (child) => visit(child, nextFunctionName, nextTemplateName), context);
        if (!ts.isJsxElement(next) || tagName(next) !== partTag) return next;

        const name = readRequiredName(next, 'Template.Part');
        const scope = nextTemplateName ?? nextFunctionName;
        if (!scope) fail(next, '<Template.Part> must be declared inside a named Template or function.');
        const key = `${scope}:${name}`;
        if (seen.has(key)) fail(next, `Duplicate <Template.Part name="${name}"> in scope \`${scope}\`.`);
        seen.add(key);
        const lowering = options.parts[key];
        if (!lowering) fail(next, `No target lowering is configured for <Template.Part> key \`${key}\`.`);

        const child = singleJsxElementChild(next.children);
        if (!child || ts.isJsxFragment(child)) {
          fail(next, `<Template.Part name="${name}"> must contain exactly one component child.`);
        }
        return lowerTemplatePartChild(child, lowering, factory);
      };

      return ts.visitEachChild(sourceFile, (node) => visit(node), context);
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
  const name = readRequiredName(element, 'Template');
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
    const parameters = lowering.parameters?.length ? lowering.parameters : ['props'];
    const root = createRoot(reference.element, factory, lowering.rootTag, parameters[0]);
    const callback = factory.createArrowFunction(
      undefined,
      undefined,
      parameters.map((parameter) => factory.createParameterDeclaration(undefined, undefined, parameter)),
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
  const root = createRoot(reference.element, factory, lowering.rootTag);
  const tag = factory.createIdentifier(lowering.templateTag ?? 'template');
  return factory.createJsxElement(
    factory.createJsxOpeningElement(tag, undefined, factory.createJsxAttributes([])),
    [root],
    factory.createJsxClosingElement(tag)
  );
}

function createRoot(
  template: ts.JsxElement,
  factory: ts.NodeFactory,
  rootTag?: string,
  spread?: string
): JsxElementLike {
  if (!rootTag) {
    const child = singleJsxElementChild(template.children);
    if (!child || ts.isJsxFragment(child)) {
      fail(template, '<Template> must contain exactly one component child when no generated root is configured.');
    }
    if (!spread) return child;
    const attributes = jsxAttributes(child);
    return updateJsxAttributes(
      child,
      factory.updateJsxAttributes(attributes, [
        factory.createJsxSpreadAttribute(factory.createIdentifier(spread)),
        ...attributes.properties,
      ]),
      factory
    );
  }

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

function lowerTemplatePartChild(
  child: JsxElementLike,
  lowering: TemplatePartLowering,
  factory: ts.NodeFactory
): ts.JsxChild {
  let element = lowering.tag ? replaceTag(child, lowering.tag, factory) : child;

  if (lowering.kind === 'attribute') {
    const attributes = jsxAttributes(element);
    element = updateJsxAttributes(
      element,
      factory.updateJsxAttributes(attributes, [
        ...attributes.properties,
        factory.createJsxAttribute(
          factory.createIdentifier(lowering.attribute),
          factory.createStringLiteral(lowering.value)
        ),
      ]),
      factory
    );
    return element;
  }

  const root = factory.createIdentifier(lowering.root);
  const value = lowering.property
    ? lowering.optionalAccess
      ? factory.createPropertyAccessChain(root, factory.createToken(ts.SyntaxKind.QuestionDotToken), lowering.property)
      : factory.createPropertyAccessExpression(root, lowering.property)
    : root;
  element = withChildren(element, [factory.createJsxExpression(undefined, value)], factory);
  return lowering.optional
    ? factory.createJsxExpression(
        undefined,
        factory.createConditionalExpression(
          value,
          factory.createToken(ts.SyntaxKind.QuestionToken),
          element,
          factory.createToken(ts.SyntaxKind.ColonToken),
          factory.createNull()
        )
      )
    : element;
}

function replaceTag(element: JsxElementLike, name: string, factory: ts.NodeFactory): JsxElementLike {
  const tag = factory.createIdentifier(name);
  if (ts.isJsxSelfClosingElement(element)) {
    return factory.updateJsxSelfClosingElement(element, tag, element.typeArguments, element.attributes);
  }
  return factory.updateJsxElement(
    element,
    factory.updateJsxOpeningElement(
      element.openingElement,
      tag,
      element.openingElement.typeArguments,
      element.openingElement.attributes
    ),
    element.children,
    factory.updateJsxClosingElement(element.closingElement, tag)
  );
}

function withChildren(
  element: JsxElementLike,
  children: readonly ts.JsxChild[],
  factory: ts.NodeFactory
): ts.JsxElement {
  const tag = ts.isJsxElement(element) ? element.openingElement.tagName : element.tagName;
  const typeArguments = ts.isJsxElement(element) ? element.openingElement.typeArguments : element.typeArguments;
  return factory.createJsxElement(
    factory.createJsxOpeningElement(tag, typeArguments, jsxAttributes(element)),
    children,
    factory.createJsxClosingElement(tag)
  );
}

function readRequiredName(element: JsxElementLike, label: string): string {
  const name = readStringAttribute(jsxAttributes(element), 'name');
  if (name === undefined) fail(element, `<${label}> requires a static \`name\` prop.`);
  if (name === null || name.length === 0) fail(element, `<${label} name> must be a non-empty string literal.`);
  return name;
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
