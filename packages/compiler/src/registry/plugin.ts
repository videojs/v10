import { createHash } from 'node:crypto';
import { isAbsolute, relative } from 'node:path';
import ts from 'typescript';
import type { ComponentDefinition, ComponentRecord } from '../components/definition';
import { Fragment } from '../components/jsx-runtime';
import type { CompilerPlugin, CompilerTarget } from '../config';
import { DiagnosticError, diagnosticLocationFromNode } from '../diagnostics';
import { HTML_RUNTIME_IMPORT } from '../targets/html';
import { collectTopLevelBindingNames } from '../utils/bindings';
import {
  createIndexedAccessType,
  createInterfaceDeclaration,
  createLiteralType,
  createNamedType,
} from '../utils/declarations';
import { getImportSource } from '../utils/import-declaration';
import {
  hasJsxAttribute,
  isJsxElementLike,
  jsxAttributeNameText,
  jsxAttributes,
  jsxChildren,
  readJsxAttributeValue,
} from '../utils/jsx';
import { toPosixPath } from '../utils/path';
import { collectReferencedIdentifiers } from '../utils/references';
import {
  type ComponentRegistry,
  isHost,
  REGISTRY_NODE,
  type RegistryElement,
  type RegistryEntry,
  type RegistryEntryReference,
  type RegistryImport,
  type RegistryNode,
  type RegistryPartEntry,
  type RegistryPropsReference,
  type RegistryTemplate,
} from './definition';
import { createRegistryElement, isRegistryElement, normalizeRegistryElement, REGISTRY_ENTRY } from './element';

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

interface ModuleImports {
  readonly named: ReadonlyMap<
    string,
    { readonly source: string; readonly imported: string; readonly typeOnly: boolean }
  >;
}

interface RequestedImport {
  readonly source: string;
  readonly imported: string;
  readonly local: string;
  typeOnly: boolean;
}

interface RegistryConfigEntry {
  readonly parts?: Readonly<Record<string, unknown>>;
  readonly render?: (context: unknown) => RegistryNode;
  readonly imports?: readonly string[];
}

interface TransformState {
  readonly context: ts.TransformationContext;
  readonly factory: ts.NodeFactory;
  readonly canonical: CanonicalImports;
  readonly discardedCompilerTypes: Set<string>;
  readonly requestedImports: Map<string, RequestedImport>;
  readonly sideEffectImports: Set<string>;
  readonly registry: ComponentRegistry;
  readonly moduleId: string;
  readonly modules: ModuleImports;
  readonly scopes: WeakMap<ts.Node, RegistryScope>;
  readonly sourceFile: ts.SourceFile;
  readonly target?: CompilerTarget | undefined;
  readonly usedNames: Set<string>;
  nextSyntheticScope: number;
  projection?: FunctionProjection | undefined;
  template?: TemplateScope | undefined;
  visitor: ts.Visitor;
}

interface FunctionProjection {
  readonly bindingNames: ReadonlySet<string>;
  readonly forwardedNames: ReadonlySet<string>;
  readonly properties: Map<string, ProjectedProperty>;
  readonly entries: RegistryEntry<any>[];
}

interface ProjectedProperty {
  readonly name: string;
  readonly property: string;
  readonly entry: RegistryEntry<any>;
}

interface RegistryScope {
  readonly prefix: string;
  hasIds(): boolean;
  id(name: string): string;
}

interface ComponentScope {
  readonly boundary: boolean;
  readonly registry: RegistryScope;
}

interface TemplateScope {
  readonly parts: Readonly<Record<string, RegistryPartEntry<any>>>;
  readonly parameters: Readonly<Record<string, SourceExpression>>;
}

/** Lower canonical component JSX through a framework-owned component registry. */
export function plugin(registry: ComponentRegistry): CompilerPlugin {
  return {
    name: 'vjsc:components',
    enforce: 'post',
    setup({ configDir, filename, target }) {
      const moduleId = registryModuleId(filename, configDir);

      return {
        transform: (context) => (sourceFile) => transformComponents(sourceFile, registry, target, moduleId, context),
      };
    },
  };
}

function transformComponents(
  sourceFile: ts.SourceFile,
  registry: ComponentRegistry,
  target: CompilerTarget | undefined,
  moduleId: string,
  context: ts.TransformationContext
): ts.SourceFile {
  const componentSources = registry.bindings.map(({ schema }) => schema.source);
  const canonical = collectCanonicalImports(sourceFile, [...componentSources, COMPILER_COMPONENT_SOURCE]);
  if (canonical.named.size === 0 && canonical.namespaces.size === 0) return sourceFile;

  const state: TransformState = {
    context,
    factory: context.factory,
    canonical,
    discardedCompilerTypes: new Set(),
    requestedImports: new Map(),
    sideEffectImports: new Set(),
    registry,
    moduleId,
    modules: collectModuleImports(sourceFile),
    scopes: new WeakMap(),
    sourceFile,
    target,
    usedNames: collectTopLevelBindingNames(sourceFile),
    nextSyntheticScope: 0,
    visitor(node) {
      if (ts.isTypeReferenceNode(node)) {
        const propsOf = transformPropsOfType(node, state);
        if (propsOf !== node) return propsOf;

        const transformed = transformCompilerType(node, state);
        if (transformed !== node) return transformed;
      }

      if (ts.isFunctionDeclaration(node)) {
        return transformFunctionDeclaration(node, state);
      }

      if (ts.isJsxElement(node)) {
        const templated = transformTemplates(node, state);
        const reference = canonicalReference(templated, canonical);

        if (reference) return transformCanonicalElement(templated, reference, state);
        const transformed = ts.visitEachChild(templated, state.visitor, context) as
          | ts.JsxElement
          | ts.JsxSelfClosingElement;

        return transformLocalProps(transformed, state);
      } else if (ts.isJsxSelfClosingElement(node)) {
        const reference = canonicalReference(node, canonical);
        if (reference) return transformCanonicalElement(node, reference, state);

        const transformed = ts.visitEachChild(node, state.visitor, context) as ts.JsxSelfClosingElement;

        return transformLocalProps(transformed, state);
      }

      return ts.visitEachChild(node, state.visitor, context);
    },
  };

  const transformed = ts.visitEachChild(sourceFile, state.visitor, context);
  return updateImports(transformed, new Set([...componentSources, COMPILER_COMPONENT_SOURCE]), state);
}

function transformPropsOfType(node: ts.TypeReferenceNode, state: TransformState): ts.TypeNode {
  if (!ts.isIdentifier(node.typeName) || node.typeName.text !== 'PropsOf') return node;

  const helper = state.canonical.named.get(node.typeName.text);
  const query = node.typeArguments?.[0];
  if (helper?.source !== COMPILER_COMPONENT_SOURCE || !query || !ts.isTypeQueryNode(query)) return node;
  if (!ts.isIdentifier(query.exprName)) return node;

  const component = state.modules.named.get(query.exprName.text);
  if (!component) return node;

  const name = `${component.imported}Props`;
  const local = requestNamedImport(component.source, name, name, true, state);
  state.discardedCompilerTypes.add(node.typeName.text);
  return createNamedType(local, [], state.factory);
}

function transformCompilerType(node: ts.TypeReferenceNode, state: TransformState): ts.TypeNode {
  if (!ts.isIdentifier(node.typeName)) return node;

  const local = node.typeName.text;
  const reference = state.canonical.named.get(local);
  if (reference?.source !== COMPILER_COMPONENT_SOURCE) return node;

  const entry = state.registry.types?.(reference.component);
  if (!entry) return node;

  state.discardedCompilerTypes.add(local);
  return registryImportType(entry, entry.name, state);
}

function transformFunctionDeclaration(node: ts.FunctionDeclaration, state: TransformState): ts.VisitResult<ts.Node> {
  const props = canonicalPropsParameter(node.parameters[0]);
  const previous = state.projection;

  if (!props || !node.name || previous) {
    return ts.visitEachChild(node, state.visitor, state.context);
  }

  const projection: FunctionProjection = {
    bindingNames: parameterBindingNames(node.parameters[0]!),
    forwardedNames: forwardedPropNames(node.parameters[0]!),
    properties: new Map(),
    entries: [],
  };
  state.projection = projection;

  let transformed: ts.FunctionDeclaration;

  try {
    transformed = ts.visitEachChild(node, state.visitor, state.context);
  } finally {
    state.projection = previous;
  }

  const entry = uniqueProjectedEntry(projection.entries);
  if (!entry?.props) return transformed;

  const propsName = `${node.name.text}Props`;
  const entryType = registryPropsType(entry.props, entry.props.name, state);
  const omitted = new Set(props.includesChildren ? [] : ['children']);
  if (entry.props.children && entry.props.children !== 'children') {
    omitted.add('children');
    omitted.add(entry.props.children);
  }
  for (const name of props.omitted) omitted.add(name);

  const heritage =
    omitted.size === 0
      ? entryType
      : createNamedType('Omit', [
          entryType,
          omitted.size === 1
            ? createLiteralType([...omitted][0]!, state.factory)
            : state.factory.createUnionTypeNode([...omitted].map((name) => createLiteralType(name, state.factory))),
        ]);
  const declaration = createInterfaceDeclaration(
    {
      name: propsName,
      export: true,
      extends: [heritage],
      members: [
        ...props.members
          .filter((member) => {
            const name = propertyNameText(member.name);
            return !name || !projection.properties.has(name);
          })
          .map((member) => ts.visitNode(member, state.visitor) as ts.TypeElement),
        ...(props.includesChildren &&
        projection.bindingNames.has('children') &&
        !hasTypeMember(props.members, 'children')
          ? [projectedChildrenSignature(entry, state)]
          : []),
        ...[...projection.properties.values()]
          .filter(
            (property) =>
              property.property !== property.name ||
              !property.entry.props ||
              !entry.props ||
              !sameImport(property.entry.props, entry.props)
          )
          .map((property) => projectedPropertySignature(property, state)),
      ],
    },
    state.factory
  );
  const parameter = transformed.parameters[0]!;
  const nextParameter = state.factory.updateParameterDeclaration(
    parameter,
    parameter.modifiers,
    parameter.dotDotDotToken,
    parameter.name,
    parameter.questionToken,
    createNamedType(propsName, [], state.factory),
    parameter.initializer
  );

  state.discardedCompilerTypes.add(props.typeName);
  state.usedNames.add(propsName);

  return [
    declaration,
    state.factory.updateFunctionDeclaration(
      transformed,
      transformed.modifiers,
      transformed.asteriskToken,
      transformed.name,
      transformed.typeParameters,
      [nextParameter, ...transformed.parameters.slice(1)],
      transformed.type,
      transformed.body
    ),
  ];
}

function canonicalPropsParameter(parameter: ts.ParameterDeclaration | undefined):
  | {
      readonly includesChildren: boolean;
      readonly omitted: readonly string[];
      readonly members: readonly ts.TypeElement[];
      readonly typeName: string;
    }
  | undefined {
  if (!parameter?.type) return undefined;

  const types = ts.isIntersectionTypeNode(parameter.type) ? parameter.type.types : [parameter.type];
  const reference = types.find(
    (type) =>
      ts.isTypeReferenceNode(type) &&
      ts.isIdentifier(type.typeName) &&
      (type.typeName.text === 'Props' || type.typeName.text === 'PropsWithChildren')
  );
  if (!reference || !ts.isTypeReferenceNode(reference) || !ts.isIdentifier(reference.typeName)) return undefined;

  const typeName = reference.typeName.text;
  if (typeName !== 'Props' && typeName !== 'PropsWithChildren') return undefined;

  return {
    includesChildren: typeName === 'PropsWithChildren',
    omitted: omittedTypeProperties(reference.typeArguments?.[0]),
    members: [
      ...types.flatMap((type) => (ts.isTypeLiteralNode(type) ? [...type.members] : [])),
      ...inlineTypeMembers(reference.typeArguments?.[0]),
    ],
    typeName,
  };
}

function inlineTypeMembers(type: ts.TypeNode | undefined): readonly ts.TypeElement[] {
  if (!type) return [];
  if (ts.isTypeLiteralNode(type)) return type.members;
  if (!ts.isIntersectionTypeNode(type)) return [];
  return type.types.flatMap((item) => (ts.isTypeLiteralNode(item) ? [...item.members] : []));
}

function omittedTypeProperties(type: ts.TypeNode | undefined): readonly string[] {
  if (!type || !ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName) || type.typeName.text !== 'Omit') {
    return [];
  }

  const keys = type.typeArguments?.[1];
  if (!keys) return [];

  const types = ts.isUnionTypeNode(keys) ? keys.types : [keys];
  return types.flatMap((item) =>
    ts.isLiteralTypeNode(item) && ts.isStringLiteral(item.literal) ? [item.literal.text] : []
  );
}

function forwardedPropNames(parameter: ts.ParameterDeclaration): ReadonlySet<string> {
  if (ts.isIdentifier(parameter.name)) return new Set([parameter.name.text]);
  if (!ts.isObjectBindingPattern(parameter.name)) return new Set();

  return new Set(
    parameter.name.elements.flatMap((element) =>
      element.dotDotDotToken && ts.isIdentifier(element.name) ? [element.name.text] : []
    )
  );
}

function parameterBindingNames(parameter: ts.ParameterDeclaration): ReadonlySet<string> {
  if (ts.isIdentifier(parameter.name)) return new Set([parameter.name.text]);
  if (!ts.isObjectBindingPattern(parameter.name)) return new Set();

  return new Set(
    parameter.name.elements.flatMap((element) => (ts.isIdentifier(element.name) ? [element.name.text] : []))
  );
}

function uniqueProjectedEntry(entries: readonly RegistryEntry<any>[]): RegistryEntry<any> | undefined {
  const withProps = entries.filter((entry) => entry.props);
  if (withProps.length === 0) return undefined;

  const first = withProps[0]!;
  return withProps.every((entry) => entry.props === first.props || sameImport(entry.props!, first.props!))
    ? first
    : undefined;
}

function sameImport(a: RegistryImport, b: RegistryImport): boolean {
  return (
    a.from === b.from &&
    a.name === b.name &&
    (a.path ?? []).join('.') === (b.path ?? []).join('.') &&
    (!('intrinsic' in a) || !('intrinsic' in b) || a.intrinsic === b.intrinsic) &&
    (!('children' in a) || !('children' in b) || a.children === b.children)
  );
}

function registryPropsType(
  reference: RegistryPropsReference,
  preferredLocal: string,
  state: TransformState
): ts.TypeReferenceNode {
  const local = requestNamedImport(reference.from, reference.name, preferredLocal, true, state);
  let typeName: ts.EntityName = state.factory.createIdentifier(local);

  for (const part of reference.path ?? []) {
    typeName = state.factory.createQualifiedName(typeName, part);
  }

  return createNamedType(
    typeName,
    reference.intrinsic ? [createLiteralType(reference.intrinsic, state.factory)] : [],
    state.factory
  );
}

function projectedPropertySignature(property: ProjectedProperty, state: TransformState): ts.PropertySignature {
  const props = property.entry.props!;
  const entry = registryPropsType(props, props.name, state);

  return state.factory.createPropertySignature(
    undefined,
    property.name,
    property.name === 'className' ? state.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
    createIndexedAccessType(entry, createLiteralType(property.property, state.factory), state.factory)
  );
}

function propertyNameText(name: ts.PropertyName | undefined): string | undefined {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function hasTypeMember(members: readonly ts.TypeElement[], name: string): boolean {
  return members.some((member) => propertyNameText(member.name) === name);
}

function projectedChildrenSignature(entry: RegistryEntry<any>, state: TransformState): ts.PropertySignature {
  const reference = state.registry.types?.('VjscNode');
  const entryProperty = entry.props!.children;
  const type = entryProperty
    ? createIndexedAccessType(
        registryPropsType(entry.props!, entry.props!.name, state),
        createLiteralType(entryProperty, state.factory),
        state.factory
      )
    : reference
      ? registryImportType(reference, reference.name, state)
      : createIndexedAccessType(
          registryPropsType(entry.props!, entry.props!.name, state),
          createLiteralType('children', state.factory),
          state.factory
        );

  return state.factory.createPropertySignature(
    undefined,
    'children',
    state.factory.createToken(ts.SyntaxKind.QuestionToken),
    type
  );
}

function registryImportType(reference: RegistryImport, preferredLocal: string, state: TransformState): ts.TypeNode {
  const local = requestNamedImport(reference.from, reference.name, preferredLocal, true, state);
  let name: ts.EntityName = state.factory.createIdentifier(local);

  for (const part of reference.path ?? []) name = state.factory.createQualifiedName(name, part);
  return createNamedType(name, [], state.factory);
}

function transformPrimitive(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  reference: CanonicalReference,
  state: TransformState
): ts.Node {
  const scope = registryScope(node, state);

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
    reference.component === 'Group'
      ? state.registry.primitives.Group
      : reference.component === 'Slot'
        ? state.registry.primitives.Slot
        : reference.component === 'Text'
          ? state.registry.primitives.Text
          : undefined;

  if (!transform) {
    throw new Error(`Component registry does not define the <${reference.component}> compiler primitive.`);
  }

  const output = applyPartTransform(node, transform, reference.local, scope, state);
  return wrapHtmlScope(output, { boundary: true, registry: scope }, state);
}

function transformTemplates(node: ts.JsxElement, state: TransformState): ts.JsxElement | ts.JsxSelfClosingElement {
  const templates = state.registry.primitives.Template;
  if (!templates) return node;

  let attributes = node.openingElement.attributes;
  let hasHostAttributes = false;
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

    const rendered = renderTemplate(child, template, state);

    if (rendered.hostAttributes) {
      for (const attribute of rendered.hostAttributes) {
        if (ts.isJsxAttribute(attribute) && hasJsxAttribute(attributes, jsxAttributeNameText(attribute.name))) {
          templateError(node, `Template parent already declares "${jsxAttributeNameText(attribute.name)}".`);
        }
      }

      attributes = state.factory.updateJsxAttributes(attributes, [
        ...attributes.properties,
        ...rendered.hostAttributes,
      ]);
      hasHostAttributes = true;
      continue;
    }

    children.push(rendered.child!);
  }

  if (!changed) return node;

  const nextChildren = hasHostAttributes ? meaningfulJsxChildren(children) : children;

  if (hasHostAttributes && nextChildren.length === 0) {
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
): { hostAttributes?: readonly ts.JsxAttributeLike[]; child?: ts.JsxChild } {
  const previous = state.template;
  const scope = registryScope(node, state);

  state.template = {
    parts: template.parts ?? {},
    parameters: {},
  };

  try {
    const output = materializeTemplateOutput(
      template.render(renderContext(sourceRenderProps(node, new Set(['name'])), scope)),
      scope,
      state
    );

    if (isRegistryNode(output) && isHost(output.type)) {
      return { hostAttributes: registryAttributes(output.props, state).properties };
    }

    const child = registryOutputToJsx(output, undefined, 'TemplatePrimitive', scope, state);
    return { child: wrapHtmlScope(child, { boundary: true, registry: scope }, state) as ts.JsxChild };
  } finally {
    state.template = previous;
  }
}

function materializeTemplateOutput(output: unknown, scope: RegistryScope, state: TransformState): unknown {
  if (Array.isArray(output)) return output.map((value) => materializeTemplateOutput(value, scope, state));
  if (!isRegistryNode(output)) return output;

  if (isRegistryElement(output.type) && isTransformEntry(output.type[REGISTRY_ENTRY])) {
    return transformEntryOutput(output, output.type[REGISTRY_ENTRY], scope, state);
  }

  return {
    ...output,
    props: Object.fromEntries(
      Object.entries(output.props).map(([name, value]) => [name, materializeTemplateOutput(value, scope, state)])
    ),
  } satisfies RegistryNode;
}

function transformTemplatePart(node: ts.JsxElement | ts.JsxSelfClosingElement, state: TransformState): ts.Node {
  const template = state.template;
  if (!template) return templateError(node, '<Template.Part> must be contained by a configured <Template>.');

  const name = readStaticName(node);
  const transform = template.parts[name];

  if (!transform) {
    return templateError(node, `Template does not define <Template.Part name="${name}">.`);
  }

  const props = sourceRenderProps(node, new Set(['name']));
  for (const [parameter, value] of Object.entries(template.parameters)) {
    Object.defineProperty(props, parameter, {
      configurable: false,
      enumerable: false,
      value,
    });
  }

  const scope = registryScope(node, state);

  return applyPartTransform(node, transform, `${pascalCase(name)}Primitive`, scope, state, props);
}

function applyPartTransform(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  transform: RegistryPartEntry<Record<string, unknown>>,
  preferredLocal: string,
  scope: RegistryScope,
  state: TransformState,
  props = sourceRenderProps(node)
): ts.Node {
  const hosted = hostedPart(transform);
  const output = hosted?.render ?? transform;

  if (output === Fragment) {
    return registryOutputToJsx(props.children, undefined, preferredLocal, scope, state);
  }

  const entry = normalizeRegistryElement(output);
  if (entry) {
    return applyEntry(node, entry, undefined, preferredLocal, scope, state, props);
  }

  if (typeof output !== 'function') {
    throw new Error('Component transforms must be an entry, hosted render, Fragment, or registry JSX.');
  }

  return registryOutputToJsx(output(renderContext(props, scope)), hosted?.host, preferredLocal, scope, state);
}

function addRootSpread(
  root: ts.JsxChild,
  name: string,
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (!isJsxElementLike(root)) {
    return templateError(root, 'A render-prop template must contain exactly one JSX element.');
  }

  const attributes = jsxAttributes(root);
  const next = factory.updateJsxAttributes(attributes, [
    ...attributes.properties,
    factory.createJsxSpreadAttribute(factory.createIdentifier(name)),
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

function isCompilerTemplate(node: ts.JsxChild, imports: CanonicalImports): node is ts.JsxElement {
  if (!ts.isJsxElement(node)) return false;

  const reference = canonicalReference(node, imports);
  return reference?.source === COMPILER_COMPONENT_SOURCE && reference.component === 'Template' && !reference.part;
}

function readStaticName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const attribute = jsxAttributes(node).properties.find(
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

  const binding = registryBinding(state.registry, reference.source);
  const definition = binding?.schema.definitions[reference.component];
  const componentEntry = binding?.entries[reference.component];

  if (!definition) {
    throw new Error(
      `Unknown canonical component <${reference.component}${reference.part ? `.${reference.part}` : ''}> from ` +
        `\`${reference.source}\`.`
    );
  }

  if (!componentEntry) {
    throw new Error(`Component registry does not define <${reference.component}>.`);
  }

  const scope = componentRegistryScope(node, reference, definition, state);
  const finish = (output: ts.Node) => wrapHtmlScope(output, scope, state);
  const config = registryConfig(componentEntry, Boolean(definition.parts));
  for (const source of config?.imports ?? []) addSideEffectImport(source, state);

  if (config?.render && definition.parts && reference.part === definition.root) {
    const output = executeComponentRender(config.render, node, reference, definition.parts, scope.registry, state);
    return finish(registryOutputToJsx(output, undefined, reference.local, scope.registry, state));
  }

  const configured = reference.part
    ? valueAt(config?.parts ?? (config ? undefined : componentEntry), reference.part)
    : (config?.render ?? (config ? undefined : componentEntry));
  const hosted = hostedPart(configured);
  const transform = hosted?.render ?? configured;
  const host = hosted?.host;

  if (!transform) {
    if (!host) {
      throw new Error(
        `Component registry does not define a transform for ` +
          `<${reference.component}${reference.part ? `.${reference.part}` : ''}>.`
      );
    }

    return finish(applyEntry(node, host, undefined, reference.local, scope.registry, state));
  }

  if (transform === Fragment) {
    return finish(
      ts.isJsxElement(node)
        ? state.factory.createJsxFragment(
            state.factory.createJsxOpeningFragment(),
            visitChildren(node.children, state),
            state.factory.createJsxJsxClosingFragment()
          )
        : state.factory.createJsxFragment(
            state.factory.createJsxOpeningFragment(),
            [],
            state.factory.createJsxJsxClosingFragment()
          )
    );
  }

  const element = normalizeRegistryElement(transform);
  if (element) {
    return finish(applyEntry(node, element, host, reference.local, scope.registry, state));
  }
  if (typeof transform !== 'function') {
    throw new Error('Component part transforms must be an entry, hosted render, Fragment, or registry JSX.');
  }

  if (host) recordProjectedEntry(node, host, state);

  const output = transform(renderContext(sourceRenderProps(node), scope.registry));

  return finish(registryOutputToJsx(output, host, reference.local, scope.registry, state));
}

function registryBinding(registry: ComponentRegistry, source: string) {
  for (let index = registry.bindings.length - 1; index >= 0; index--) {
    const binding = registry.bindings[index]!;
    if (binding.schema.source === source) return binding;
  }

  return undefined;
}

function executeComponentRender(
  render: (context: unknown) => RegistryNode,
  root: ts.JsxElement | ts.JsxSelfClosingElement,
  reference: CanonicalReference,
  parts: ComponentRecord,
  scope: RegistryScope,
  state: TransformState
): RegistryNode {
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
  return render({ root: rootPart, parts: collections, id: scope.id, reference: createRegistryElement });
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

function componentRegistryScope(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  reference: CanonicalReference,
  definition: ComponentDefinition<object, ComponentRecord | undefined>,
  state: TransformState
): ComponentScope {
  let owner: ts.Node = node;
  const rootPart = definition.root;

  if (definition.parts && rootPart) {
    owner = findComponentRoot(node, reference, rootPart, state) ?? owner;
  }

  return {
    boundary: sameNodeOccurrence(owner, node),
    registry: registryScope(owner, state),
  };
}

function sameNodeOccurrence(left: ts.Node, right: ts.Node): boolean {
  if (left === right) return true;

  const leftSource = ts.getOriginalNode(left);
  const rightSource = ts.getOriginalNode(right);
  return leftSource.pos >= 0 && leftSource.pos === rightSource.pos && leftSource.end === rightSource.end;
}

function findComponentRoot(
  node: ts.Node,
  reference: CanonicalReference,
  rootPart: string,
  state: TransformState
): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
  const source = ts.getOriginalNode(node);
  if (source.pos < 0 || source.end < 0) return undefined;

  let match: ts.JsxElement | ts.JsxSelfClosingElement | undefined;
  let matchSize = Number.POSITIVE_INFINITY;

  const visit = (candidate: ts.Node): void => {
    if (ts.isJsxElement(candidate) || ts.isJsxSelfClosingElement(candidate)) {
      const original = ts.getOriginalNode(candidate);
      const candidateReference = canonicalReference(candidate, state.canonical);
      const contains = original.pos <= source.pos && original.end >= source.end;
      const size = original.end - original.pos;

      if (
        contains &&
        size < matchSize &&
        candidateReference?.source === reference.source &&
        candidateReference.component === reference.component &&
        candidateReference.part === rootPart
      ) {
        match = candidate;
        matchSize = size;
      }
    }

    ts.forEachChild(candidate, visit);
  };

  visit(state.sourceFile);
  return match;
}

function registryScope(node: ts.Node, state: TransformState): RegistryScope {
  const existing = state.scopes.get(node);
  if (existing) return existing;

  const original = ts.getOriginalNode(node);
  const position = original.pos >= 0 ? original.pos.toString(36) : `s${(state.nextSyntheticScope++).toString(36)}`;
  const prefix = state.target?.name === 'html' ? `${state.moduleId}-${position}` : `vjs-${state.moduleId}-${position}`;
  const ids = new Map<string, string>();
  const scope: RegistryScope = {
    prefix,
    hasIds() {
      return ids.size > 0;
    },
    id(name) {
      if (!/^[a-z][a-z0-9-]*$/i.test(name)) {
        throw new Error(
          'Registry identifier names must start with a letter and contain only letters, numbers, or dashes.'
        );
      }

      const existingId = ids.get(name);
      if (existingId) return existingId;

      const id = state.target?.name === 'html' ? `__vjsc-id-${prefix}-${name}` : `${prefix}-${name}`;
      ids.set(name, id);
      return id;
    },
  };

  state.scopes.set(node, scope);
  return scope;
}

function wrapHtmlScope(output: ts.Node, scope: ComponentScope, state: TransformState): ts.Node {
  if (state.target?.name !== 'html' || !scope.boundary || !scope.registry.hasIds()) return output;

  const local = requestNamedImport(HTML_RUNTIME_IMPORT, 'Scope', 'HtmlScope', false, state);
  const tag = state.factory.createIdentifier(local);

  return state.factory.createJsxElement(
    state.factory.createJsxOpeningElement(
      tag,
      undefined,
      state.factory.createJsxAttributes([literalAttribute('prefix', scope.registry.prefix, state.factory)])
    ),
    [output as ts.JsxChild],
    state.factory.createJsxClosingElement(tag)
  );
}

function registryModuleId(filename: string, configDir: string): string {
  const modulePath = toPosixPath(isAbsolute(filename) ? relative(configDir, filename) : filename);
  return createHash('sha256').update(modulePath).digest('base64url').slice(0, 10);
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
  const props = sourceProps(jsxAttributes(node), omitted) as Record<string, unknown> & {
    children: SourceChildren;
  };

  Object.defineProperty(props, 'children', {
    configurable: false,
    enumerable: false,
    value: sourceChildren(jsxChildren(node)),
  });

  return props;
}

function sourceChildren(children: readonly ts.JsxChild[]): SourceChildren {
  return { [SOURCE_CHILDREN]: true, children };
}

function registryOutputToJsx(
  output: unknown,
  currentHost: RegistryElement | undefined,
  preferredLocal: string,
  scope: RegistryScope,
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
      output.flatMap((child) => registryChildren(child, currentHost, preferredLocal, scope, state)),
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
      registryChildren(node.props.children, currentHost, preferredLocal, scope, state),
      state.factory.createJsxJsxClosingFragment()
    );
  }

  if (isHost(node.type) && node.props.children !== undefined) {
    const children = registryChildren(node.props.children, undefined, preferredLocal, scope, state);
    return forwardTransparentHost(children, node.props, currentHost, preferredLocal, state);
  }

  const entry = isHost(node.type) ? currentHost : isRegistryElement(node.type) ? node.type : undefined;
  if (!entry) throw new Error('<Host> requires a host for the current component or part.');

  const definition = entry[REGISTRY_ENTRY];

  if (isTransformEntry(definition)) {
    return state.factory.createJsxExpression(
      undefined,
      transformEntryOutput(node, definition, scope, state).expression
    );
  }

  if (isRenderEntry(definition)) {
    const context = renderContext(node.props, scope);
    const rendered = registryOutputToJsx(definition.render(context), currentHost, preferredLocal, scope, state);
    const condition = definition.when?.(context);

    return condition === undefined ? rendered : conditionalChild(condition, rendered, state);
  }

  const tag = registryElementTag(entry, preferredLocal, state);
  const attributes = registryAttributes(node.props, state, entry);
  const children = registryChildren(node.props.children, currentHost, preferredLocal, scope, state);

  if (children.length === 0) {
    return state.factory.createJsxSelfClosingElement(tag, undefined, attributes);
  }

  return state.factory.createJsxElement(
    state.factory.createJsxOpeningElement(tag, undefined, attributes),
    children,
    state.factory.createJsxClosingElement(tag)
  );
}

function transformEntryOutput(
  node: RegistryNode,
  definition: Extract<RegistryEntry<any>, { readonly transform: unknown }>,
  scope: RegistryScope,
  state: TransformState
): SourceExpression {
  const expression = definition.transform({
    ...renderContext(node.props, scope),
    factory: state.factory,
    render(options = {}) {
      const template = state.template;
      const parameters = options.parameters ?? [];
      const previous = state.template;

      if (parameters.length > 0 && !template) {
        throw new Error('Registry transform parameters require a configured <Template>.');
      }

      if (template) {
        state.template = {
          parts: template.parts,
          parameters: Object.fromEntries(
            parameters.map((name) => [
              name,
              createSourceExpression(state.factory.createIdentifier(name), state.factory),
            ])
          ),
        };
      }

      let rendered: ts.JsxChild;

      try {
        const output = materializeTemplateOutput(node.props.children, scope, state);
        const content = isSourceChildren(output) ? sourceChildren(meaningfulJsxChildren(output.children)) : output;

        rendered = registryOutputToJsx(content, undefined, 'RegistryTransform', scope, state);
      } finally {
        state.template = previous;
      }

      const content = options.spreadProps ? addRootSpread(rendered, options.spreadProps, state.factory) : rendered;

      return state.factory.createParenthesizedExpression(jsxChildExpression(content, state.factory));
    },
  });

  return createSourceExpression(expression, state.factory);
}

function fragmentOrChild(children: readonly ts.JsxChild[], factory: ts.NodeFactory): ts.JsxChild {
  if (children.length === 1) return children[0]!;

  return factory.createJsxFragment(factory.createJsxOpeningFragment(), children, factory.createJsxJsxClosingFragment());
}

function forwardTransparentHost(
  children: readonly ts.JsxChild[],
  props: Record<string, unknown>,
  entry: RegistryElement | undefined,
  preferredLocal: string,
  state: TransformState
): ts.JsxChild {
  const forwarded = registryAttributes(props, state, entry).properties;
  const entryPath = entry ? jsxTagPath(registryElementTag(entry, preferredLocal, state)) : undefined;
  const result = forwardAttributes(children, forwarded, entryPath, state.factory);

  if (result.hosts === 0 && !entryPath && state.target?.name === 'html') {
    const dynamic = forwardDynamicHtmlHost(result.children, forwarded, state);
    if (dynamic) return dynamic;
  }

  if (result.hosts !== 1) {
    throw new Error(`Transparent <Host> requires exactly one concrete child host, received ${result.hosts}.`);
  }

  return fragmentOrChild(result.children, state.factory);
}

function forwardDynamicHtmlHost(
  children: readonly ts.JsxChild[],
  attributes: readonly ts.JsxAttributeLike[],
  state: TransformState
): ts.JsxChild | undefined {
  const meaningful = meaningfulJsxChildren(children);
  const child = meaningful[0];
  if (meaningful.length !== 1 || !child || !ts.isJsxExpression(child) || !child.expression) {
    return undefined;
  }

  const local = requestNamedImport(HTML_RUNTIME_IMPORT, 'Host', 'HtmlHost', false, state);
  const tag = state.factory.createIdentifier(local);

  return state.factory.createJsxElement(
    state.factory.createJsxOpeningElement(tag, undefined, state.factory.createJsxAttributes(attributes)),
    meaningful,
    state.factory.createJsxClosingElement(tag)
  );
}

function forwardAttributes(
  children: readonly ts.JsxChild[],
  attributes: readonly ts.JsxAttributeLike[],
  hostPath: string | undefined,
  factory: ts.NodeFactory
): { children: ts.JsxChild[]; hosts: number } {
  let hosts = 0;
  const output = children.map((child): ts.JsxChild => {
    if (ts.isJsxSelfClosingElement(child)) {
      if (hostPath && jsxTagPath(child.tagName) !== hostPath) return child;

      hosts++;
      return factory.updateJsxSelfClosingElement(
        child,
        child.tagName,
        child.typeArguments,
        factory.updateJsxAttributes(child.attributes, [...child.attributes.properties, ...attributes])
      );
    }

    if (ts.isJsxElement(child)) {
      const opening = child.openingElement;

      if (hostPath && jsxTagPath(opening.tagName) !== hostPath) {
        const nested = forwardAttributes(child.children, attributes, hostPath, factory);
        hosts += nested.hosts;
        return factory.updateJsxElement(child, opening, nested.children, child.closingElement);
      }

      hosts++;
      return factory.updateJsxElement(
        child,
        factory.updateJsxOpeningElement(
          opening,
          opening.tagName,
          opening.typeArguments,
          factory.updateJsxAttributes(opening.attributes, [...opening.attributes.properties, ...attributes])
        ),
        child.children,
        child.closingElement
      );
    }

    if (ts.isJsxFragment(child)) {
      const nested = forwardAttributes(child.children, attributes, hostPath, factory);
      hosts += nested.hosts;
      return factory.updateJsxFragment(child, child.openingFragment, nested.children, child.closingFragment);
    }

    return child;
  });

  return { children: output, hosts };
}

function jsxTagPath(tag: ts.JsxTagNameExpression): string {
  if (ts.isIdentifier(tag)) return tag.text;
  if (ts.isPropertyAccessExpression(tag))
    return `${jsxTagPath(tag.expression as ts.JsxTagNameExpression)}.${tag.name.text}`;
  return '';
}

function conditionalChild(condition: unknown, child: ts.JsxChild, state: TransformState): ts.JsxChild {
  if (!isSourceExpression(condition)) {
    throw new Error('Registry `when` functions must return a template parameter expression.');
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

function registryAttributes(
  props: Record<string, unknown>,
  state: TransformState,
  entry?: RegistryElement | undefined
): ts.JsxAttributes {
  const attributes: ts.JsxAttributeLike[] = [];

  for (const [sourceName, value] of Object.entries(props)) {
    const name = outputAttributeName(sourceName, state);

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

  return transformEntryProps(state.factory.createJsxAttributes(attributes), entry, state);
}

function registryChildren(
  value: unknown,
  currentHost: RegistryElement | undefined,
  preferredLocal: string,
  scope: RegistryScope,
  state: TransformState
): ts.JsxChild[] {
  if (value === undefined || value === null || value === false) return [];
  if (isSourceChildren(value)) return visitChildren(value.children, state);
  if (isSourceExpression(value)) {
    return [state.factory.createJsxExpression(undefined, value.expression)];
  }
  if (isRegistryNode(value)) {
    const child = registryOutputToJsx(value, currentHost, preferredLocal, scope, state);

    return isEmptyJsxFragment(child) ? [] : [child];
  }
  if (Array.isArray(value)) {
    return value.flatMap((child) => registryChildren(child, currentHost, preferredLocal, scope, state));
  }
  if (typeof value === 'string' || typeof value === 'number') return [state.factory.createJsxText(String(value))];

  throw new Error(`Unsupported registry JSX child: ${String(value)}`);
}

function isEmptyJsxFragment(node: ts.JsxChild): node is ts.JsxFragment {
  return ts.isJsxFragment(node) && meaningfulJsxChildren(node.children).length === 0;
}

function childrenExpression(children: readonly ts.JsxChild[], state: TransformState): ts.Expression {
  const meaningful = meaningfulJsxChildren(children);
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

function meaningfulJsxChildren(children: readonly ts.JsxChild[]): ts.JsxChild[] {
  return children.filter(
    (child) =>
      (!ts.isJsxText(child) || !child.containsOnlyTriviaWhiteSpaces) &&
      (!ts.isJsxExpression(child) || child.expression !== undefined)
  );
}

function applyEntry(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  entry: RegistryElement,
  currentHost: RegistryElement | undefined,
  preferredLocal: string,
  scope: RegistryScope,
  state: TransformState,
  props = sourceRenderProps(node)
): ts.Node {
  recordProjectedEntry(node, entry, state);

  if (!isRenderEntry(entry[REGISTRY_ENTRY]) && !isTransformEntry(entry[REGISTRY_ENTRY])) {
    return replaceHost(node, entry, preferredLocal, state);
  }

  const output: RegistryNode = {
    [REGISTRY_NODE]: true,
    type: entry,
    props,
    key: null,
  };

  return registryOutputToJsx(output, currentHost, preferredLocal, scope, state);
}

function recordProjectedEntry(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  entry: RegistryElement,
  state: TransformState
): void {
  const projection = state.projection;
  const definition = entry[REGISTRY_ENTRY];
  if (!projection || !definition.props) return;

  const forwardsProps = jsxAttributes(node).properties.some(
    (attribute) =>
      ts.isJsxSpreadAttribute(attribute) &&
      ts.isIdentifier(attribute.expression) &&
      projection.forwardedNames.has(attribute.expression.text)
  );

  if (forwardsProps) projection.entries.push(definition);

  for (const attribute of jsxAttributes(node).properties) {
    if (!ts.isJsxAttribute(attribute)) continue;

    const property = jsxAttributeNameText(attribute.name);
    const expression = readJsxAttributeValue(attribute, state.factory);

    if (expression && ts.isIdentifier(expression) && projection.bindingNames.has(expression.text)) {
      projection.properties.set(expression.text, {
        name: expression.text,
        property,
        entry: definition,
      });
    } else if (
      property === 'className' &&
      projection.bindingNames.has('className') &&
      expressionContainsIdentifier(expression, 'className')
    ) {
      projection.properties.set('className', { name: 'className', property, entry: definition });
    }
  }
}

function expressionContainsIdentifier(expression: ts.Expression | undefined, name: string): boolean {
  return expression ? collectReferencedIdentifiers(expression).has(name) : false;
}

function replaceHost(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  entry: RegistryElement,
  preferredLocal: string,
  state: TransformState
): ts.JsxElement | ts.JsxSelfClosingElement {
  const tag = registryElementTag(entry, preferredLocal, state);

  if (ts.isJsxSelfClosingElement(node)) {
    return state.factory.updateJsxSelfClosingElement(
      node,
      tag,
      node.typeArguments,
      registryElementAttributes(node.attributes, entry, state)
    );
  }

  const attributes = registryElementAttributes(node.openingElement.attributes, entry, state);
  const children = visitChildren(node.children, state);

  if (children.length === 0) {
    return state.factory.createJsxSelfClosingElement(tag, node.openingElement.typeArguments, attributes);
  }

  return state.factory.updateJsxElement(
    node,
    state.factory.updateJsxOpeningElement(node.openingElement, tag, node.openingElement.typeArguments, attributes),
    children,
    state.factory.updateJsxClosingElement(node.closingElement, tag)
  );
}

function registryElementTag(
  element: RegistryElement,
  preferredLocal: string,
  state: TransformState
): ts.JsxTagNameExpression {
  const reference = element[REGISTRY_ENTRY];

  if (!isEntryReference(reference)) {
    throw new Error('Rendered registry entries do not have an output tag.');
  }

  if (!isModuleEntry(reference)) {
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

function requestImport(reference: RegistryEntryReference, preferredLocal: string, state: TransformState): string {
  if (!isModuleEntry(reference)) throw new Error('HTML element entries do not request named imports.');

  return requestNamedImport(reference.import.from, reference.import.name, preferredLocal, false, state);
}

function requestNamedImport(
  source: string,
  name: string,
  preferredLocal: string,
  typeOnly: boolean,
  state: TransformState
): string {
  const resolved = resolveNamedImport(source, name, state);

  if (!resolved) {
    throw new Error(`Registry entry import \`${name}\` from \`${source}\` cannot be removed.`);
  }

  const imported = resolved.name;
  const moduleImport = [...state.modules.named].find(
    ([, value]) => value.source === resolved.source && value.imported === imported && (typeOnly || !value.typeOnly)
  );

  if (moduleImport) return moduleImport[0];

  const key = `${resolved.source}\0${imported}`;
  const existing = state.requestedImports.get(key);
  if (existing) {
    if (!typeOnly) existing.typeOnly = false;
    return existing.local;
  }

  let local = preferredLocal || imported;
  if (state.usedNames.has(local) && !isCanonicalLocal(state.canonical, local)) {
    let suffix = 2;
    local = `${imported}Primitive`;
    while (state.usedNames.has(local)) local = `${imported}Primitive${suffix++}`;
  }

  state.usedNames.add(local);
  state.requestedImports.set(key, { source: resolved.source, imported, local, typeOnly });
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

function registryElementAttributes(
  attributes: ts.JsxAttributes,
  entry: RegistryElement,
  state: TransformState
): ts.JsxAttributes {
  const visited = ts.visitEachChild(attributes, state.visitor, state.context);
  return transformEntryProps(visited, entry, state);
}

function transformEntryProps(
  attributes: ts.JsxAttributes,
  entry: RegistryElement | undefined,
  state: TransformState,
  rename = true
): ts.JsxAttributes {
  return state.factory.updateJsxAttributes(
    attributes,
    attributes.properties.map((attribute) => {
      if (!ts.isJsxAttribute(attribute)) return attribute;

      const name = jsxAttributeNameText(attribute.name);
      const expression = readJsxAttributeValue(attribute, state.factory);
      const transformed = expression ? transformPropExpression(name, expression, entry, state) : undefined;
      const outputName = rename ? outputAttributeName(name, state) : name;

      return state.factory.updateJsxAttribute(
        attribute,
        outputName === name ? attribute.name : state.factory.createIdentifier(outputName),
        transformed ? state.factory.createJsxExpression(undefined, transformed) : attribute.initializer
      );
    })
  );
}

function transformLocalProps(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  state: TransformState
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (ts.isJsxSelfClosingElement(node)) {
    return state.factory.updateJsxSelfClosingElement(
      node,
      node.tagName,
      node.typeArguments,
      transformEntryProps(node.attributes, undefined, state, false)
    );
  }

  return state.factory.updateJsxElement(
    node,
    state.factory.updateJsxOpeningElement(
      node.openingElement,
      node.openingElement.tagName,
      node.openingElement.typeArguments,
      transformEntryProps(node.openingElement.attributes, undefined, state, false)
    ),
    node.children,
    node.closingElement
  );
}

function transformPropExpression(
  name: string,
  expression: ts.Expression,
  element: RegistryElement | undefined,
  state: TransformState
): ts.Expression | undefined {
  const entry = element?.[REGISTRY_ENTRY];
  const transform = state.registry.props?.transform;
  if (!transform) return undefined;

  return transform({
    name,
    value: expression,
    entry: entry && isEntryReference(entry) ? entry : undefined,
    factory: state.factory,
    import(reference) {
      const local = requestNamedImport(reference.from, reference.name, reference.name, false, state);
      return state.factory.createIdentifier(local);
    },
  });
}

function isEntryReference(entry: RegistryEntry<any>): entry is RegistryEntryReference {
  return !isRenderEntry(entry) && !isTransformEntry(entry);
}

function outputAttributeName(name: string, state: TransformState): string {
  return state.target?.name === 'html' && name === 'className' ? 'class' : name;
}

function isModuleEntry(
  reference: RegistryEntryReference
): reference is Extract<RegistryEntryReference, { readonly import: { readonly name: string } }> {
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
    if (!retained) return [];

    return source === COMPILER_COMPONENT_SOURCE ? resolveCompilerTypeImports(retained, state) : [retained];
  });
  const grouped = new Map<string, RequestedImport[]>();
  for (const request of state.requestedImports.values()) {
    const requests = grouped.get(request.source) ?? [];
    requests.push(request);
    grouped.set(request.source, requests);
  }

  const mergedStatements = statements.map((statement) => mergeRequestedImports(statement, grouped, state.factory));
  const imports: ts.ImportDeclaration[] = [];

  for (const source of [...state.sideEffectImports].sort()) {
    imports.push(
      state.factory.createImportDeclaration(undefined, undefined, state.factory.createStringLiteral(source))
    );
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
                  request.typeOnly,
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

  const insertion = mergedStatements.findIndex((statement) => !ts.isImportDeclaration(statement));
  const index = insertion < 0 ? mergedStatements.length : insertion;
  return state.factory.updateSourceFile(sourceFile, [
    ...mergedStatements.slice(0, index),
    ...imports,
    ...mergedStatements.slice(index),
  ]);
}

function mergeRequestedImports(
  statement: ts.Statement,
  grouped: Map<string, RequestedImport[]>,
  factory: ts.NodeFactory
): ts.Statement {
  if (!ts.isImportDeclaration(statement)) return statement;

  const source = getImportSource(statement);
  const clause = statement.importClause;
  const bindings = clause?.namedBindings;
  const requests = source ? grouped.get(source) : undefined;

  if (!source || !requests || !clause || clause.isTypeOnly || !bindings || !ts.isNamedImports(bindings)) {
    return statement;
  }

  const existing = new Set(bindings.elements.map((element) => element.name.text));
  const additions = requests
    .filter((request) => !existing.has(request.local))
    .sort((a, b) => a.imported.localeCompare(b.imported))
    .map((request) =>
      factory.createImportSpecifier(
        request.typeOnly,
        request.imported === request.local ? undefined : factory.createIdentifier(request.imported),
        factory.createIdentifier(request.local)
      )
    );

  grouped.delete(source);

  if (additions.length === 0) return statement;

  return factory.updateImportDeclaration(
    statement,
    statement.modifiers,
    factory.updateImportClause(
      clause,
      false,
      clause.name,
      factory.updateNamedImports(bindings, [...bindings.elements, ...additions])
    ),
    statement.moduleSpecifier,
    statement.attributes
  );
}

function resolveCompilerTypeImports(declaration: ts.ImportDeclaration, state: TransformState): ts.ImportDeclaration[] {
  const resolveType = state.registry.types;
  const clause = declaration.importClause;
  const bindings = clause?.namedBindings;

  if (!resolveType || !clause || !bindings || !ts.isNamedImports(bindings)) return [declaration];

  const grouped = new Map<string, ts.ImportSpecifier[]>();
  const retained: ts.ImportSpecifier[] = [];

  for (const element of bindings.elements) {
    if (!clause.isTypeOnly && !element.isTypeOnly) continue;
    if (state.discardedCompilerTypes.has(element.name.text)) continue;

    const sourceName = element.propertyName?.text ?? element.name.text;
    const entry = resolveType(sourceName);

    if (!entry) {
      retained.push(state.factory.updateImportSpecifier(element, false, element.propertyName, element.name));
      continue;
    }
    if (entry.path?.length) throw new Error(`Registry type entry \`${sourceName}\` cannot declare an import path.`);

    const resolved = resolveNamedImport(entry.from, entry.name, state);
    if (!resolved) {
      retained.push(state.factory.updateImportSpecifier(element, false, element.propertyName, element.name));
      continue;
    }

    const imports = grouped.get(resolved.source) ?? [];
    imports.push(
      state.factory.createImportSpecifier(
        false,
        resolved.name === element.name.text ? undefined : state.factory.createIdentifier(resolved.name),
        element.name
      )
    );
    grouped.set(resolved.source, imports);
  }

  const resolved = [...grouped]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, imports]) =>
      state.factory.createImportDeclaration(
        undefined,
        state.factory.createImportClause(true, undefined, state.factory.createNamedImports(imports)),
        state.factory.createStringLiteral(source)
      )
    );

  if (clause.name || retained.length > 0) {
    resolved.unshift(
      state.factory.createImportDeclaration(
        undefined,
        state.factory.createImportClause(
          true,
          clause.name,
          retained.length > 0 ? state.factory.createNamedImports(retained) : undefined
        ),
        declaration.moduleSpecifier
      )
    );
  }

  return resolved;
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

    const bindings = clause?.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      namespaces.set(bindings.name.text, source);
      continue;
    }

    for (const element of bindings.elements) {
      named.set(element.name.text, {
        source,
        component: element.propertyName?.text ?? element.name.text,
      });
    }
  }

  return { named, namespaces };
}

function collectModuleImports(sourceFile: ts.SourceFile): ModuleImports {
  const named = new Map<string, { source: string; imported: string; typeOnly: boolean }>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const source = getImportSource(statement);
    const bindings = statement.importClause?.namedBindings;
    if (!source || !bindings || !ts.isNamedImports(bindings)) continue;

    for (const element of bindings.elements) {
      named.set(element.name.text, {
        source,
        imported: element.propertyName?.text ?? element.name.text,
        typeOnly: Boolean(statement.importClause?.isTypeOnly || element.isTypeOnly),
      });
    }
  }

  return { named };
}

function canonicalReference(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  imports: CanonicalImports
): CanonicalReference | undefined {
  const path = tagPath(ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName);
  return canonicalReferenceFromPath(path, imports);
}

function canonicalReferenceFromPath(
  path: readonly string[],
  imports: CanonicalImports
): CanonicalReference | undefined {
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
    local: `${path[1]}Primitive`,
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

function registryConfig(entry: unknown, compound: boolean): RegistryConfigEntry | undefined {
  if (!entry || typeof entry !== 'object' || isRegistryElement(entry)) return undefined;

  if (compound && ('parts' in entry || 'render' in entry || 'imports' in entry)) {
    return entry as RegistryConfigEntry;
  }
  return undefined;
}

function hostedPart(
  value: unknown
):
  | { readonly host: RegistryElement; readonly render: (context: ReturnType<typeof renderContext>) => unknown }
  | undefined {
  if (!value || typeof value !== 'object' || !('host' in value) || !('render' in value)) return undefined;

  const hosted = value as { readonly host: unknown; readonly render: unknown };
  const host = normalizeRegistryElement(hosted.host);

  return host && typeof hosted.render === 'function'
    ? { host, render: hosted.render as (context: ReturnType<typeof renderContext>) => unknown }
    : undefined;
}

function valueAt(value: unknown, path: string | null): unknown {
  if (!value || typeof value !== 'object' || !path) return undefined;

  let current: unknown = value;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function visitChildren(children: readonly ts.JsxChild[], state: TransformState): ts.JsxChild[] {
  const transformed = children.flatMap((child) => {
    const result = ts.visitNode(child, state.visitor) as ts.JsxChild | undefined;

    return !result || isEmptyJsxFragment(result) ? [] : [result];
  });

  return meaningfulJsxChildren(transformed);
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

function renderContext<Props extends object>(props: Props & { readonly children?: unknown }, scope: RegistryScope) {
  return { props, id: scope.id, reference: createRegistryElement };
}

function isRegistryNode(value: unknown): value is RegistryNode {
  return Boolean(value && typeof value === 'object' && REGISTRY_NODE in value);
}

function isRenderEntry(entry: RegistryEntry<any>): entry is Extract<RegistryEntry<any>, { readonly render: unknown }> {
  return 'render' in entry;
}

function isTransformEntry(
  entry: RegistryEntry<any>
): entry is Extract<RegistryEntry<any>, { readonly transform: unknown }> {
  return 'transform' in entry;
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
