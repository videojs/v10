import ts from 'typescript';
import type { CompilerPlugin, CompilerTarget } from '../config';
import { DiagnosticError, diagnosticLocationFromNode } from '../diagnostics';
import { getImportSource } from '../utils/import-declaration';
import type { ComponentDefinition, ComponentRecord } from './definition';
import { Fragment } from './jsx-runtime';
import {
  type ComponentRegistry,
  Host,
  type HostComponent,
  isHost,
  isTargetComponent,
  REGISTRY_NODE,
  REGISTRY_TARGET,
  type RegistryEntry,
  type RegistryNode,
  type RegistryPartTransform,
  type RegistryTemplate,
  type TargetComponent,
  type TargetDefinition,
  type TargetReference,
} from './registry';

const COMPILER_COMPONENT_SOURCE = 'vjsc/components';
const SOURCE_VALUE = Symbol('vjsc/source-value');
const SOURCE_CHILDREN = Symbol('vjsc/source-children');
const SOURCE_EXPRESSION = Symbol('vjsc/source-expression');

interface SourceValue {
  readonly [SOURCE_VALUE]: true;
  readonly attribute: ts.JsxAttributeLike;
}

interface SourceChildren {
  readonly [SOURCE_CHILDREN]: true;
  readonly children: readonly ts.JsxChild[];
}

interface SourceExpression {
  readonly [SOURCE_EXPRESSION]: true;
  readonly expression: ts.Expression;
}

interface CanonicalReference {
  readonly source: string;
  readonly component: string;
  readonly local: string;
  readonly part: string | null;
}

interface CanonicalImports {
  readonly named: ReadonlyMap<string, { readonly source: string; readonly component: string }>;
  readonly namespaces: ReadonlyMap<string, string>;
}

interface RequestedImport {
  readonly source: string;
  readonly imported: string;
  readonly local: string;
}

interface RegistryConfigEntry {
  readonly host?: unknown;
  readonly parts?: Readonly<Record<string, unknown>>;
  readonly render?: ((context: unknown) => RegistryNode) | HostComponent;
  readonly imports?: readonly string[];
}

interface TransformState {
  readonly context: ts.TransformationContext;
  readonly factory: ts.NodeFactory;
  readonly canonical: CanonicalImports;
  readonly requestedImports: Map<string, RequestedImport>;
  readonly sideEffectImports: Set<string>;
  readonly registry: ComponentRegistry;
  readonly target?: CompilerTarget | undefined;
  readonly usedNames: Set<string>;
  template?: TemplateScope | undefined;
  visitor: ts.Visitor;
}

interface TemplateScope {
  readonly parts: Readonly<Record<string, RegistryPartTransform<Record<string, unknown>>>>;
  readonly parameters: Readonly<Record<string, SourceExpression>>;
}

/** Lower canonical component JSX through a framework-owned component registry. */
export function plugin(registry: ComponentRegistry): CompilerPlugin {
  return {
    name: 'vjsc:components',
    enforce: 'post',
    setup({ target }) {
      return {
        transform: (context) => (sourceFile) => transformComponents(sourceFile, registry, target, context),
      };
    },
  };
}

function transformComponents(
  sourceFile: ts.SourceFile,
  registry: ComponentRegistry,
  target: CompilerTarget | undefined,
  context: ts.TransformationContext
): ts.SourceFile {
  const canonical = collectCanonicalImports(sourceFile, [registry.components.source, COMPILER_COMPONENT_SOURCE]);
  if (canonical.named.size === 0 && canonical.namespaces.size === 0) return sourceFile;

  const state: TransformState = {
    context,
    factory: context.factory,
    canonical,
    requestedImports: new Map(),
    sideEffectImports: new Set(),
    registry,
    target,
    usedNames: collectTopLevelNames(sourceFile),
    visitor(node) {
      if (ts.isJsxElement(node)) {
        const templated = transformTemplates(node, state);
        const reference = canonicalReference(templated, canonical);

        if (reference) return transformCanonicalElement(templated, reference, state);
        if (templated !== node) return ts.visitEachChild(templated, state.visitor, context);
      } else if (ts.isJsxSelfClosingElement(node)) {
        const reference = canonicalReference(node, canonical);
        if (reference) return transformCanonicalElement(node, reference, state);
      }

      return ts.visitEachChild(node, state.visitor, context);
    },
  };

  const transformed = ts.visitEachChild(sourceFile, state.visitor, context);
  return updateImports(transformed, new Set([registry.components.source, COMPILER_COMPONENT_SOURCE]), state);
}

function transformPrimitive(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  reference: CanonicalReference,
  state: TransformState
): ts.Node {
  if (reference.component === 'Template') {
    if (reference.part !== 'Part') {
      return templateError(node, '<Template> must be a direct child of the element that consumes it.');
    }

    return transformTemplatePart(node, state);
  }

  if (reference.part) {
    throw new Error(`Compiler primitive <${reference.component}> does not define a "${reference.part}" part.`);
  }

  const transform =
    reference.component === 'Slot'
      ? state.registry.primitives.Slot
      : reference.component === 'Text'
        ? state.registry.primitives.Text
        : undefined;

  if (!transform) {
    throw new Error(`Component registry does not define the <${reference.component}> compiler primitive.`);
  }

  return applyPartTransform(node, transform, undefined, reference.local, state);
}

function transformTemplates(node: ts.JsxElement, state: TransformState): ts.JsxElement | ts.JsxSelfClosingElement {
  const templates = state.registry.primitives.Template;
  if (!templates) return node;

  let attributes = node.openingElement.attributes;
  let attached = false;
  let changed = false;
  const children: ts.JsxChild[] = [];

  for (const child of node.children) {
    if (!isCompilerTemplate(child, state.canonical)) {
      children.push(child);
      continue;
    }

    const name = readStaticName(child);
    const template = templates[name];

    if (!template) {
      templateError(child, `Component registry does not define <Template name="${name}">.`);
    }

    changed = true;

    if (template.attach) {
      if (hasJsxAttribute(attributes, template.attach.prop)) {
        templateError(node, `Template parent already declares "${template.attach.prop}".`);
      }

      attributes = state.factory.updateJsxAttributes(attributes, [
        ...attributes.properties,
        createTemplateAttribute(child, template, state),
      ]);
      attached = true;
      continue;
    }

    children.push(renderTemplate(child, template, state));
  }

  if (!changed) return node;

  const nextChildren = attached
    ? children.filter(
        (child) =>
          (!ts.isJsxText(child) || child.text.trim().length > 0) &&
          (!ts.isJsxExpression(child) || child.expression !== undefined)
      )
    : children;

  if (attached && nextChildren.length === 0) {
    return state.factory.createJsxSelfClosingElement(
      node.openingElement.tagName,
      node.openingElement.typeArguments,
      attributes
    );
  }

  return state.factory.updateJsxElement(
    node,
    state.factory.updateJsxOpeningElement(
      node.openingElement,
      node.openingElement.tagName,
      node.openingElement.typeArguments,
      attributes
    ),
    nextChildren,
    node.closingElement
  );
}

function renderTemplate(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  template: RegistryTemplate,
  state: TransformState
): ts.JsxChild {
  const parameters = Object.fromEntries(
    (template.attach?.parameters ?? []).map((name) => [
      name,
      createSourceExpression(state.factory.createIdentifier(name), state.factory),
    ])
  );
  const previous = state.template;

  state.template = {
    parts: template.parts ?? {},
    parameters,
  };

  try {
    let output: unknown;

    if (template.root) {
      const props = sourceRenderProps(node, new Set(['name']));
      addTemplateSpread(props, template, state);

      output = registryNode(template.root, props);
    } else {
      const root = singleTemplateRoot(node);
      const content = template.attach?.spread ? addRootSpread(root, template.attach.spread, state.factory) : root;

      output = sourceChildren([content]);
    }

    if (template.target) {
      output = registryNode(template.target, { children: output });
    }

    return registryOutputToJsx(output, undefined, 'TemplateTarget', state);
  } finally {
    state.template = previous;
  }
}

function createTemplateAttribute(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  template: RegistryTemplate,
  state: TransformState
): ts.JsxAttribute {
  const attachment = template.attach!;
  const rendered = renderTemplate(node, template, state);
  const callback = state.factory.createArrowFunction(
    undefined,
    undefined,
    attachment.parameters.map((name) =>
      state.factory.createParameterDeclaration(undefined, undefined, state.factory.createIdentifier(name))
    ),
    undefined,
    state.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    state.factory.createParenthesizedExpression(jsxChildExpression(rendered, state.factory))
  );

  return state.factory.createJsxAttribute(
    state.factory.createIdentifier(attachment.prop),
    state.factory.createJsxExpression(undefined, callback)
  );
}

function transformTemplatePart(node: ts.JsxElement | ts.JsxSelfClosingElement, state: TransformState): ts.Node {
  const scope = state.template;
  if (!scope) return templateError(node, '<Template.Part> must be contained by a configured <Template>.');

  const name = readStaticName(node);
  const transform = scope.parts[name];

  if (!transform) {
    return templateError(node, `Template does not define <Template.Part name="${name}">.`);
  }

  const props = sourceRenderProps(node, new Set(['name']));
  for (const [parameter, value] of Object.entries(scope.parameters)) {
    Object.defineProperty(props, parameter, {
      configurable: false,
      enumerable: false,
      value,
    });
  }

  return applyPartTransform(node, transform, undefined, `${pascalCase(name)}Target`, state, props);
}

function applyPartTransform(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  transform: RegistryPartTransform<Record<string, unknown>>,
  host: TargetComponent | undefined,
  preferredLocal: string,
  state: TransformState,
  props = sourceRenderProps(node)
): ts.Node {
  if (isHost(transform)) {
    if (!host) throw new Error('<Host> requires a host for the current component or part.');
    return replaceHost(node, host, preferredLocal, state);
  }

  if (transform === Fragment) {
    return registryOutputToJsx(props.children, host, preferredLocal, state);
  }

  if (isTargetComponent(transform)) {
    return applyTarget(node, transform, host, preferredLocal, state, props);
  }

  if (typeof transform !== 'function') {
    throw new Error('Component transforms must be Host, a target, Fragment, or registry JSX.');
  }

  return registryOutputToJsx(transform({ props }), host, preferredLocal, state);
}

function registryNode(type: TargetComponent, props: Record<string, unknown>): RegistryNode {
  return {
    [REGISTRY_NODE]: true,
    type,
    props,
    key: null,
  };
}

function addTemplateSpread(props: Record<string, unknown>, template: RegistryTemplate, state: TransformState): void {
  const name = template.attach?.spread;
  if (!name) return;

  props.__template_spread = {
    [SOURCE_VALUE]: true,
    attribute: state.factory.createJsxSpreadAttribute(state.factory.createIdentifier(name)),
  } satisfies SourceValue;
}

function addRootSpread(
  root: ts.JsxChild,
  name: string,
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (!isJsxElement(root)) {
    return templateError(root, 'A render-prop template must contain exactly one JSX element.');
  }

  const attributes = attributesOf(root);
  const next = factory.updateJsxAttributes(attributes, [
    factory.createJsxSpreadAttribute(factory.createIdentifier(name)),
    ...attributes.properties,
  ]);

  if (ts.isJsxSelfClosingElement(root)) {
    return factory.updateJsxSelfClosingElement(root, root.tagName, root.typeArguments, next);
  }

  return factory.updateJsxElement(
    root,
    factory.updateJsxOpeningElement(
      root.openingElement,
      root.openingElement.tagName,
      root.openingElement.typeArguments,
      next
    ),
    root.children,
    root.closingElement
  );
}

function singleTemplateRoot(node: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxChild {
  const children = childrenOf(node).filter((child) => !ts.isJsxText(child) || child.text.trim().length > 0);

  if (children.length !== 1) {
    return templateError(node, `<Template> requires exactly one JSX root, received ${children.length}.`);
  }

  return children[0]!;
}

function isCompilerTemplate(node: ts.JsxChild, imports: CanonicalImports): node is ts.JsxElement {
  if (!ts.isJsxElement(node)) return false;

  const reference = canonicalReference(node, imports);
  return reference?.source === COMPILER_COMPONENT_SOURCE && reference.component === 'Template' && !reference.part;
}

function readStaticName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const attribute = attributesOf(node).properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && jsxAttributeNameText(property.name) === 'name'
  );
  const value = attribute?.initializer;

  if (value && ts.isStringLiteral(value)) return value.text;
  if (value && ts.isJsxExpression(value) && value.expression && ts.isStringLiteral(value.expression)) {
    return value.expression.text;
  }

  return templateError(node, '<Template> and <Template.Part> require a static string `name` prop.');
}

function templateError(node: ts.Node, message: string): never {
  throw new DiagnosticError(message, {
    ...diagnosticLocationFromNode(node),
    diagnosticCode: 'jsx-template-invalid',
  });
}

function hasJsxAttribute(attributes: ts.JsxAttributes, name: string): boolean {
  return attributes.properties.some(
    (attribute) => ts.isJsxAttribute(attribute) && jsxAttributeNameText(attribute.name) === name
  );
}

function isJsxElement(node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement {
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
}

function pascalCase(value: string): string {
  return value.replace(/(^|[-_.]+)(\w)/g, (_match, _separator, character: string) => character.toUpperCase());
}

function transformCanonicalElement(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  reference: CanonicalReference,
  state: TransformState
): ts.Node {
  if (reference.source === COMPILER_COMPONENT_SOURCE) {
    return transformPrimitive(node, reference, state);
  }

  const definition = state.registry.components.definitions[reference.component];
  const entry = state.registry.entries[reference.component] as RegistryEntry<
    ComponentDefinition<object, ComponentRecord | undefined>
  >;

  if (!definition) {
    throw new Error(
      `Unknown canonical component <${reference.component}${reference.part ? `.${reference.part}` : ''}> from ` +
        `\`${state.registry.components.source}\`.`
    );
  }

  if (!entry) {
    throw new Error(`Component registry does not define <${reference.component}>.`);
  }

  const config = registryConfig(entry);
  for (const source of config?.imports ?? []) addSideEffectImport(source, state);

  if (config?.render && definition.parts && reference.part === definition.root) {
    const output = executeComponentRender(config.render, node, reference, definition.parts, state);
    return registryOutputToJsx(output, hostAt(config.host, reference.part), reference.local, state);
  }

  const transform = reference.part ? config?.parts?.[reference.part] : config?.render;
  const host = hostAt(config?.host ?? entry, reference.part);

  if (!transform || isHost(transform)) {
    if (!host) {
      throw new Error(
        `Component registry does not define a transform for ` +
          `<${reference.component}${reference.part ? `.${reference.part}` : ''}>.`
      );
    }

    return replaceHost(node, host, reference.local, state);
  }

  if (transform === Fragment) {
    return ts.isJsxElement(node)
      ? state.factory.createJsxFragment(
          state.factory.createJsxOpeningFragment(),
          visitChildren(node.children, state),
          state.factory.createJsxJsxClosingFragment()
        )
      : state.factory.createJsxFragment(
          state.factory.createJsxOpeningFragment(),
          [],
          state.factory.createJsxJsxClosingFragment()
        );
  }

  if (isTargetComponent(transform)) return applyTarget(node, transform, host, reference.local, state);
  if (typeof transform !== 'function') throw new Error('Component part transforms must be Host, a target, or JSX.');

  const output = transform({
    props: sourceRenderProps(node),
  });

  return registryOutputToJsx(output, host, reference.local, state);
}

function executeComponentRender(
  render: ((context: unknown) => RegistryNode) | HostComponent,
  root: ts.JsxElement | ts.JsxSelfClosingElement,
  reference: CanonicalReference,
  parts: ComponentRecord,
  state: TransformState
): RegistryNode {
  if (isHost(render)) {
    return {
      [REGISTRY_NODE]: true,
      type: Host,
      props: {
        ...sourceProps(attributesOf(root)),
        children: sourceChildren(childrenOf(root)),
      },
      key: null,
    };
  }

  const nodes = collectComponentParts(root, reference, state.canonical, reference.part!);
  const collections = Object.fromEntries(
    Object.keys(parts)
      .filter((part) => part !== reference.part)
      .map((part) => {
        const matches = nodes.get(part) ?? [];
        return [
          part,
          {
            one() {
              if (matches.length !== 1) {
                throw new Error(
                  `<${reference.component}> expected one <${reference.component}.${part}>, received ${matches.length}.`
                );
              }
              return sourcePart(matches[0]!);
            },
            all() {
              return matches.map(sourcePart);
            },
          },
        ];
      })
  );

  const rootPart = sourcePart(root);
  return render({ root: rootPart, parts: collections });
}

function sourcePart(node: ts.JsxElement | ts.JsxSelfClosingElement): { props: object } {
  const props = sourceRenderProps(node);

  return { props };
}

function collectComponentParts(
  root: ts.JsxElement | ts.JsxSelfClosingElement,
  reference: CanonicalReference,
  canonical: CanonicalImports,
  rootPart: string
): Map<string, Array<ts.JsxElement | ts.JsxSelfClosingElement>> {
  const parts = new Map<string, Array<ts.JsxElement | ts.JsxSelfClosingElement>>();

  const visit = (node: ts.Node, isRoot = false): void => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const child = canonicalReference(node, canonical);
      if (!isRoot && child?.component === reference.component && child.part === rootPart) return;

      if (!isRoot && child?.component === reference.component && child.part) {
        const values = parts.get(child.part) ?? [];
        values.push(node);
        parts.set(child.part, values);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(root, true);
  return parts;
}

function sourceProps(attributes: ts.JsxAttributes, omitted: ReadonlySet<string> = new Set()): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  let spreadIndex = 0;

  for (const attribute of attributes.properties) {
    const name = ts.isJsxSpreadAttribute(attribute)
      ? `__spread_${spreadIndex++}`
      : jsxAttributeNameText(attribute.name);

    if (omitted.has(name)) continue;

    props[name] = { [SOURCE_VALUE]: true, attribute } satisfies SourceValue;
  }

  return props;
}

function sourceRenderProps(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  omitted: ReadonlySet<string> = new Set()
): Record<string, unknown> & { children: SourceChildren } {
  const props = sourceProps(attributesOf(node), omitted) as Record<string, unknown> & {
    children: SourceChildren;
  };

  Object.defineProperty(props, 'children', {
    configurable: false,
    enumerable: false,
    value: sourceChildren(childrenOf(node)),
  });

  return props;
}

function sourceChildren(children: readonly ts.JsxChild[]): SourceChildren {
  return { [SOURCE_CHILDREN]: true, children };
}

function registryOutputToJsx(
  output: unknown,
  currentHost: TargetComponent | undefined,
  preferredLocal: string,
  state: TransformState
): ts.JsxChild {
  if (isSourceChildren(output)) {
    return fragmentOrChild(visitChildren(output.children, state), state.factory);
  }

  if (isSourceExpression(output)) {
    return state.factory.createJsxExpression(undefined, output.expression);
  }

  if (output === undefined || output === null || output === false) {
    return state.factory.createJsxFragment(
      state.factory.createJsxOpeningFragment(),
      [],
      state.factory.createJsxJsxClosingFragment()
    );
  }

  if (Array.isArray(output)) {
    return fragmentOrChild(
      output.flatMap((child) => registryChildren(child, currentHost, preferredLocal, state)),
      state.factory
    );
  }

  if (!isRegistryNode(output)) {
    throw new Error('Component registry render functions must return registry JSX or source props.');
  }

  const node = output;

  if (node.type === Fragment) {
    return state.factory.createJsxFragment(
      state.factory.createJsxOpeningFragment(),
      registryChildren(node.props.children, currentHost, preferredLocal, state),
      state.factory.createJsxJsxClosingFragment()
    );
  }

  const target = isHost(node.type) ? currentHost : isTargetComponent(node.type) ? node.type : undefined;
  if (!target) throw new Error('<Host> requires a host for the current component or part.');

  const definition = target[REGISTRY_TARGET];

  if (isRenderTargetDefinition(definition)) {
    const context = { props: node.props };
    const rendered = registryOutputToJsx(definition.render(context), currentHost, preferredLocal, state);
    const condition = definition.when?.(context);

    return condition === undefined ? rendered : conditionalChild(condition, rendered, state);
  }

  const tag = targetTag(target, preferredLocal, state);
  const attributes = registryAttributes(node.props, state);
  const children = registryChildren(node.props.children, currentHost, preferredLocal, state);

  if (children.length === 0) {
    return state.factory.createJsxSelfClosingElement(tag, undefined, attributes);
  }

  return state.factory.createJsxElement(
    state.factory.createJsxOpeningElement(tag, undefined, attributes),
    children,
    state.factory.createJsxClosingElement(tag)
  );
}

function fragmentOrChild(children: readonly ts.JsxChild[], factory: ts.NodeFactory): ts.JsxChild {
  if (children.length === 1) return children[0]!;

  return factory.createJsxFragment(factory.createJsxOpeningFragment(), children, factory.createJsxJsxClosingFragment());
}

function conditionalChild(condition: unknown, child: ts.JsxChild, state: TransformState): ts.JsxChild {
  if (!isSourceExpression(condition)) {
    throw new Error('Target `when` functions must return a template parameter expression.');
  }

  return state.factory.createJsxExpression(
    undefined,
    state.factory.createConditionalExpression(
      condition.expression,
      state.factory.createToken(ts.SyntaxKind.QuestionToken),
      jsxChildExpression(child, state.factory),
      state.factory.createToken(ts.SyntaxKind.ColonToken),
      state.factory.createNull()
    )
  );
}

function jsxChildExpression(child: ts.JsxChild, factory: ts.NodeFactory): ts.Expression {
  if (ts.isJsxExpression(child)) return child.expression ?? factory.createNull();
  if (ts.isJsxText(child)) return factory.createStringLiteral(child.text);
  return child as ts.Expression;
}

function registryAttributes(props: Record<string, unknown>, state: TransformState): ts.JsxAttributes {
  const attributes: ts.JsxAttributeLike[] = [];

  for (const [sourceName, value] of Object.entries(props)) {
    const name = targetAttributeName(sourceName, state);

    if (name === 'children' || name === 'key' || value === undefined) continue;

    if (isSourceValue(value)) {
      const attribute = ts.visitNode(value.attribute, state.visitor) as ts.JsxAttributeLike;

      if (ts.isJsxSpreadAttribute(attribute)) {
        attributes.push(attribute);
      } else if (jsxAttributeNameText(attribute.name) === name) {
        attributes.push(attribute);
      } else {
        attributes.push(
          state.factory.createJsxAttribute(
            state.factory.createIdentifier(name),
            attributeInitializerExpression(attribute, state.factory)
          )
        );
      }
      continue;
    }

    if (isSourceChildren(value)) {
      attributes.push(
        state.factory.createJsxAttribute(
          state.factory.createIdentifier(name),
          state.factory.createJsxExpression(undefined, childrenExpression(value.children, state))
        )
      );
      continue;
    }

    if (isSourceExpression(value)) {
      attributes.push(
        state.factory.createJsxAttribute(
          state.factory.createIdentifier(name),
          state.factory.createJsxExpression(undefined, value.expression)
        )
      );
      continue;
    }

    attributes.push(literalAttribute(name, value, state.factory));
  }

  return state.factory.createJsxAttributes(attributes);
}

function registryChildren(
  value: unknown,
  currentHost: TargetComponent | undefined,
  preferredLocal: string,
  state: TransformState
): ts.JsxChild[] {
  if (value === undefined || value === null || value === false) return [];
  if (isSourceChildren(value)) return visitChildren(value.children, state);
  if (isSourceExpression(value)) {
    return [state.factory.createJsxExpression(undefined, value.expression)];
  }
  if (isRegistryNode(value)) return [registryOutputToJsx(value, currentHost, preferredLocal, state)];
  if (Array.isArray(value)) {
    return value.flatMap((child) => registryChildren(child, currentHost, preferredLocal, state));
  }
  if (typeof value === 'string' || typeof value === 'number') return [state.factory.createJsxText(String(value))];

  throw new Error(`Unsupported registry JSX child: ${String(value)}`);
}

function childrenExpression(children: readonly ts.JsxChild[], state: TransformState): ts.Expression {
  const meaningful = children.filter((child) => !ts.isJsxText(child) || child.text.trim().length > 0);
  if (meaningful.length === 0) return state.factory.createNull();

  if (meaningful.length === 1) {
    const child = meaningful[0]!;
    const visited = ts.visitNode(child, state.visitor) as ts.JsxChild;
    if (ts.isJsxExpression(visited)) return visited.expression ?? state.factory.createNull();
    if (ts.isJsxText(visited)) return state.factory.createStringLiteral(visited.text);
    return visited as ts.Expression;
  }

  return state.factory.createJsxFragment(
    state.factory.createJsxOpeningFragment(),
    visitChildren(meaningful, state),
    state.factory.createJsxJsxClosingFragment()
  );
}

function applyTarget(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  target: TargetComponent,
  currentHost: TargetComponent | undefined,
  preferredLocal: string,
  state: TransformState,
  props = sourceRenderProps(node)
): ts.Node {
  if (!isRenderTargetDefinition(target[REGISTRY_TARGET])) {
    return replaceHost(node, target, preferredLocal, state);
  }

  const output: RegistryNode = {
    [REGISTRY_NODE]: true,
    type: target,
    props,
    key: null,
  };

  return registryOutputToJsx(output, currentHost, preferredLocal, state);
}

function replaceHost(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  target: TargetComponent,
  preferredLocal: string,
  state: TransformState
): ts.JsxElement | ts.JsxSelfClosingElement {
  const tag = targetTag(target, preferredLocal, state);

  if (ts.isJsxSelfClosingElement(node)) {
    return state.factory.updateJsxSelfClosingElement(
      node,
      tag,
      node.typeArguments,
      targetAttributes(node.attributes, state)
    );
  }

  return state.factory.updateJsxElement(
    node,
    state.factory.updateJsxOpeningElement(
      node.openingElement,
      tag,
      node.openingElement.typeArguments,
      targetAttributes(node.openingElement.attributes, state)
    ),
    visitChildren(node.children, state),
    state.factory.updateJsxClosingElement(node.closingElement, tag)
  );
}

function targetTag(target: TargetComponent, preferredLocal: string, state: TransformState): ts.JsxTagNameExpression {
  const reference = target[REGISTRY_TARGET];

  if (isRenderTargetDefinition(reference)) {
    throw new Error('Rendered targets do not have an output tag.');
  }

  if (!isModuleTarget(reference)) {
    if (reference.import) addSideEffectImport(reference.import.from, state);
    return state.factory.createIdentifier(reference.tagName);
  }

  const local = requestImport(reference, preferredLocal, state);
  let tag: ts.JsxTagNameExpression = state.factory.createIdentifier(local);

  for (const part of reference.import.path ?? []) {
    tag = state.factory.createPropertyAccessExpression(tag as ts.Expression, part) as ts.JsxTagNamePropertyAccess;
  }

  return tag;
}

function requestImport(reference: TargetReference, preferredLocal: string, state: TransformState): string {
  if (!isModuleTarget(reference)) throw new Error('HTML element targets do not request named imports.');

  const resolved = resolveNamedImport(reference.import.from, reference.import.name, state);

  if (!resolved) {
    throw new Error(`Target import \`${reference.import.name}\` from \`${reference.import.from}\` cannot be removed.`);
  }

  const imported = resolved.name;
  const key = `${resolved.source}\0${imported}`;
  const existing = state.requestedImports.get(key);
  if (existing) return existing.local;

  let local = preferredLocal || imported;
  if (state.usedNames.has(local) && !isCanonicalLocal(state.canonical, local)) {
    let suffix = 2;
    local = `${imported}Target`;
    while (state.usedNames.has(local)) local = `${imported}Target${suffix++}`;
  }

  state.usedNames.add(local);
  state.requestedImports.set(key, { source: resolved.source, imported, local });
  return local;
}

function resolveNamedImport(
  source: string,
  name: string,
  state: TransformState
): { source: string; name: string } | undefined {
  const rule = state.target?.imports?.[source];

  if (rule === undefined) return { source, name };
  if (rule === false) return undefined;
  if (typeof rule === 'string') return { source: rule, name };

  const resolved = rule(name);
  return resolved === false ? undefined : resolved;
}

function addSideEffectImport(source: string, state: TransformState): void {
  const rule = state.target?.imports?.[source];

  if (rule === false) return;

  state.sideEffectImports.add(typeof rule === 'string' ? rule : source);
}

function targetAttributes(attributes: ts.JsxAttributes, state: TransformState): ts.JsxAttributes {
  const visited = ts.visitEachChild(attributes, state.visitor, state.context);
  if (state.target?.name !== 'html') return visited;

  return state.factory.updateJsxAttributes(
    visited,
    visited.properties.map((attribute) => {
      if (!ts.isJsxAttribute(attribute) || jsxAttributeNameText(attribute.name) !== 'className') return attribute;

      return state.factory.updateJsxAttribute(
        attribute,
        state.factory.createIdentifier('class'),
        attribute.initializer
      );
    })
  );
}

function targetAttributeName(name: string, state: TransformState): string {
  return state.target?.name === 'html' && name === 'className' ? 'class' : name;
}

function isModuleTarget(
  reference: TargetReference
): reference is Extract<TargetReference, { readonly import: { readonly name: string } }> {
  return !('tagName' in reference);
}

function updateImports(
  sourceFile: ts.SourceFile,
  canonicalSources: ReadonlySet<string>,
  state: TransformState
): ts.SourceFile {
  const statements = sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement)) return [statement];

    const source = getImportSource(statement);
    if (!source || !canonicalSources.has(source)) return [statement];

    const retained = retainCanonicalImport(statement, state.factory);
    return retained ? [retained] : [];
  });
  const imports: ts.ImportDeclaration[] = [];

  for (const source of [...state.sideEffectImports].sort()) {
    imports.push(
      state.factory.createImportDeclaration(undefined, undefined, state.factory.createStringLiteral(source))
    );
  }

  const grouped = new Map<string, RequestedImport[]>();
  for (const request of state.requestedImports.values()) {
    const requests = grouped.get(request.source) ?? [];
    requests.push(request);
    grouped.set(request.source, requests);
  }
  for (const [source, requests] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
    imports.push(
      state.factory.createImportDeclaration(
        undefined,
        state.factory.createImportClause(
          false,
          undefined,
          state.factory.createNamedImports(
            requests
              .sort((a, b) => a.imported.localeCompare(b.imported))
              .map((request) =>
                state.factory.createImportSpecifier(
                  false,
                  request.imported === request.local ? undefined : state.factory.createIdentifier(request.imported),
                  state.factory.createIdentifier(request.local)
                )
              )
          )
        ),
        state.factory.createStringLiteral(source)
      )
    );
  }

  const insertion = statements.findIndex((statement) => !ts.isImportDeclaration(statement));
  const index = insertion < 0 ? statements.length : insertion;
  return state.factory.updateSourceFile(sourceFile, [
    ...statements.slice(0, index),
    ...imports,
    ...statements.slice(index),
  ]);
}

function retainCanonicalImport(
  declaration: ts.ImportDeclaration,
  factory: ts.NodeFactory
): ts.ImportDeclaration | undefined {
  const clause = declaration.importClause;
  if (!clause) return undefined;
  if (clause.isTypeOnly) return declaration;

  const namedBindings =
    clause.namedBindings && ts.isNamedImports(clause.namedBindings)
      ? factory.updateNamedImports(
          clause.namedBindings,
          clause.namedBindings.elements.filter((element) => element.isTypeOnly)
        )
      : undefined;
  const retainedBindings = namedBindings?.elements.length ? namedBindings : undefined;

  if (!clause.name && !retainedBindings) return undefined;

  return factory.updateImportDeclaration(
    declaration,
    declaration.modifiers,
    factory.updateImportClause(clause, false, clause.name, retainedBindings),
    declaration.moduleSpecifier,
    declaration.attributes
  );
}

function collectCanonicalImports(sourceFile: ts.SourceFile, sources: readonly string[]): CanonicalImports {
  const accepted = new Set(sources);
  const named = new Map<string, { source: string; component: string }>();
  const namespaces = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const source = getImportSource(statement);
    if (!source || !accepted.has(source)) continue;

    const clause = statement.importClause;
    if (clause?.isTypeOnly) continue;

    const bindings = clause?.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      namespaces.set(bindings.name.text, source);
      continue;
    }

    for (const element of bindings.elements) {
      if (element.isTypeOnly) continue;
      named.set(element.name.text, {
        source,
        component: element.propertyName?.text ?? element.name.text,
      });
    }
  }

  return { named, namespaces };
}

function canonicalReference(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  imports: CanonicalImports
): CanonicalReference | undefined {
  const path = tagPath(ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName);
  if (path.length === 0) return undefined;
  const root = path[0]!;
  const named = imports.named.get(root);

  if (named) {
    return {
      source: named.source,
      component: named.component,
      local: root,
      part: path.length > 1 ? path.slice(1).join('.') : null,
    };
  }

  const source = imports.namespaces.get(root);
  if (!source || path.length < 2) return undefined;

  return {
    source,
    component: path[1]!,
    local: `${path[1]}Target`,
    part: path.length > 2 ? path.slice(2).join('.') : null,
  };
}

function isCanonicalLocal(imports: CanonicalImports, name: string): boolean {
  return imports.named.has(name) || imports.namespaces.has(name);
}

function tagPath(tag: ts.JsxTagNameExpression): string[] {
  if (ts.isIdentifier(tag)) return [tag.text];
  if (ts.isPropertyAccessExpression(tag)) return [...tagPath(tag.expression as ts.JsxTagNameExpression), tag.name.text];
  return [];
}

function registryConfig(entry: unknown): RegistryConfigEntry | undefined {
  if (!entry || typeof entry !== 'object' || isTargetComponent(entry)) return undefined;
  if ('host' in entry || 'parts' in entry || 'render' in entry || 'imports' in entry) {
    return entry as RegistryConfigEntry;
  }
  return undefined;
}

function hostAt(value: unknown, part: string | null): TargetComponent | undefined {
  if (isTargetComponent(value)) return value;
  if (!value || typeof value !== 'object' || !part) return undefined;

  let current: unknown = value;
  for (const segment of part.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return isTargetComponent(current) ? current : undefined;
}

function attributesOf(node: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxAttributes {
  return ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
}

function childrenOf(node: ts.JsxElement | ts.JsxSelfClosingElement): readonly ts.JsxChild[] {
  return ts.isJsxElement(node) ? node.children : [];
}

function visitChildren(children: readonly ts.JsxChild[], state: TransformState): ts.JsxChild[] {
  return children.map((child) => ts.visitNode(child, state.visitor) as ts.JsxChild);
}

function isSourceValue(value: unknown): value is SourceValue {
  return Boolean(value && typeof value === 'object' && SOURCE_VALUE in value);
}

function isSourceChildren(value: unknown): value is SourceChildren {
  return Boolean(value && typeof value === 'object' && SOURCE_CHILDREN in value);
}

function createSourceExpression(expression: ts.Expression, factory: ts.NodeFactory): SourceExpression {
  const source: SourceExpression = {
    [SOURCE_EXPRESSION]: true,
    expression,
  };

  return new Proxy(source, {
    get(target, property, receiver) {
      if (typeof property !== 'string' || property in target) return Reflect.get(target, property, receiver);

      return createSourceExpression(factory.createPropertyAccessExpression(expression, property), factory);
    },
  });
}

function isSourceExpression(value: unknown): value is SourceExpression {
  return Boolean(value && typeof value === 'object' && SOURCE_EXPRESSION in value);
}

function isRegistryNode(value: unknown): value is RegistryNode {
  return Boolean(value && typeof value === 'object' && REGISTRY_NODE in value);
}

function isRenderTargetDefinition(
  definition: TargetDefinition<any>
): definition is Extract<TargetDefinition<any>, { readonly render: unknown }> {
  return 'render' in definition;
}

function attributeInitializerExpression(
  attribute: ts.JsxAttribute,
  factory: ts.NodeFactory
): ts.JsxAttributeValue | undefined {
  if (!attribute.initializer) return factory.createJsxExpression(undefined, factory.createTrue());
  return attribute.initializer;
}

function literalAttribute(name: string, value: unknown, factory: ts.NodeFactory): ts.JsxAttribute {
  if (value === true) return factory.createJsxAttribute(factory.createIdentifier(name), undefined);
  if (typeof value === 'string') {
    return factory.createJsxAttribute(factory.createIdentifier(name), factory.createStringLiteral(value));
  }

  const expression =
    typeof value === 'number'
      ? factory.createNumericLiteral(value)
      : value === null
        ? factory.createNull()
        : value === false
          ? factory.createFalse()
          : factory.createIdentifier('undefined');

  return factory.createJsxAttribute(factory.createIdentifier(name), factory.createJsxExpression(undefined, expression));
}

function collectTopLevelNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.name) names.add(clause.name.text);
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) names.add(element.name.text);
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      names.add(statement.name.text);
    }
  }

  return names;
}

function jsxAttributeNameText(name: ts.JsxAttributeName): string {
  return ts.isIdentifier(name) ? name.text : `${name.namespace.text}:${name.name.text}`;
}
