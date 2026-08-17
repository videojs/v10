import ts from 'typescript';
import type { CompilerPlugin, CompilerTarget } from '../config';
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
  type TargetComponent,
  type TargetReference,
} from './registry';

const SOURCE_VALUE = Symbol('@videojs/compiler/source-value');
const SOURCE_CHILDREN = Symbol('@videojs/compiler/source-children');

interface SourceValue {
  readonly [SOURCE_VALUE]: true;
  readonly attribute: ts.JsxAttributeLike;
}

interface SourceChildren {
  readonly [SOURCE_CHILDREN]: true;
  readonly children: readonly ts.JsxChild[];
}

interface CanonicalReference {
  readonly component: string;
  readonly local: string;
  readonly part: string | null;
}

interface CanonicalImports {
  readonly named: ReadonlyMap<string, string>;
  readonly namespaces: ReadonlySet<string>;
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
  visitor: ts.Visitor;
}

/** Lower canonical component JSX through a framework-owned component registry. */
export function plugin(registry: ComponentRegistry): CompilerPlugin {
  return {
    name: '@videojs/compiler:components',
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
  const canonical = collectCanonicalImports(sourceFile, registry.components.source);
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
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const reference = canonicalReference(node, canonical);
        if (reference) return transformCanonicalElement(node, reference, state);
      }

      return ts.visitEachChild(node, state.visitor, context);
    },
  };

  const transformed = ts.visitEachChild(sourceFile, state.visitor, context);
  return updateImports(transformed, registry.components.source, state);
}

function transformCanonicalElement(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  reference: CanonicalReference,
  state: TransformState
): ts.Node {
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
    return registryNodeToJsx(output, hostAt(config.host, reference.part), reference.local, state);
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

  if (isTargetComponent(transform)) return replaceHost(node, transform, reference.local, state);
  if (typeof transform !== 'function') throw new Error('Component part transforms must be Host, a target, or JSX.');

  const output = transform({
    props: sourceProps(attributesOf(node)),
    children: sourceChildren(childrenOf(node)),
  });

  return registryNodeToJsx(output, host, reference.local, state);
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

function sourcePart(node: ts.JsxElement | ts.JsxSelfClosingElement): { props: object; children: unknown } {
  return {
    props: sourceProps(attributesOf(node)),
    children: sourceChildren(childrenOf(node)),
  };
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

function sourceProps(attributes: ts.JsxAttributes): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  let spreadIndex = 0;

  for (const attribute of attributes.properties) {
    const name = ts.isJsxSpreadAttribute(attribute)
      ? `__spread_${spreadIndex++}`
      : jsxAttributeNameText(attribute.name);
    props[name] = { [SOURCE_VALUE]: true, attribute } satisfies SourceValue;
  }

  return props;
}

function sourceChildren(children: readonly ts.JsxChild[]): SourceChildren {
  return { [SOURCE_CHILDREN]: true, children };
}

function registryNodeToJsx(
  node: RegistryNode | null | undefined,
  currentHost: TargetComponent | undefined,
  preferredLocal: string,
  state: TransformState
): ts.JsxChild {
  if (node?.[REGISTRY_NODE] !== true) {
    throw new Error('Component registry render functions must return JSX.');
  }

  if (node.type === Fragment) {
    return state.factory.createJsxFragment(
      state.factory.createJsxOpeningFragment(),
      registryChildren(node.props.children, currentHost, preferredLocal, state),
      state.factory.createJsxJsxClosingFragment()
    );
  }

  const target = isHost(node.type) ? currentHost : isTargetComponent(node.type) ? node.type : undefined;
  if (!target) throw new Error('<Host> requires a host for the current component or part.');

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
  if (isRegistryNode(value)) return [registryNodeToJsx(value, currentHost, preferredLocal, state)];
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

function updateImports(sourceFile: ts.SourceFile, canonicalSource: string, state: TransformState): ts.SourceFile {
  const statements = sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) || getImportSource(statement) !== canonicalSource) return [statement];

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

function collectCanonicalImports(sourceFile: ts.SourceFile, source: string): CanonicalImports {
  const named = new Map<string, string>();
  const namespaces = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || getImportSource(statement) !== source) continue;
    const clause = statement.importClause;
    if (clause?.isTypeOnly) continue;

    const bindings = clause?.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
      continue;
    }

    for (const element of bindings.elements) {
      if (element.isTypeOnly) continue;
      named.set(element.name.text, element.propertyName?.text ?? element.name.text);
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
      component: named,
      local: root,
      part: path.length > 1 ? path.slice(1).join('.') : null,
    };
  }

  if (!imports.namespaces.has(root) || path.length < 2) return undefined;

  return {
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

function isRegistryNode(value: unknown): value is RegistryNode {
  return Boolean(value && typeof value === 'object' && REGISTRY_NODE in value);
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
