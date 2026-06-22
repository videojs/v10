import ts from 'typescript';
import type { CompilerContext, CompilerPipelineStep, CompilerPlugin, CompilerTransform } from './config';
import type { JsxElementLike } from './jsx';
import { tagName } from './jsx';
import { addNamedImport } from './transforms/add-import';
import { type ImportRewriteOptions, type ImportRule, transformImports } from './transforms/imports';

export interface ImportReference {
  readonly source: string;
  readonly name: string;
  readonly type?: boolean | undefined;
}

export interface RefHelpers {
  import(source: string, name: string, options?: { type?: boolean | undefined }): ImportReference;
}

export type MatchPredicate<Value = unknown, Context = unknown> = (value: Value, context?: Context) => boolean;

export interface MatchHelpers {
  all(...predicates: readonly MatchPredicate[]): MatchPredicate;
  jsx: {
    tag(name: string | RegExp): MatchPredicate;
    attribute(name: string): MatchPredicate;
    value: {
      array(): MatchPredicate;
    };
  };
  interface: {
    name(name: string | RegExp): MatchPredicate;
    property(name: string): MatchPredicate;
  };
}

export interface CreateHelpers {
  expr: {
    call(callee: string | ImportReference | ts.Expression, args: readonly ts.Expression[]): ts.CallExpression;
    identifier(value: string | ImportReference): ts.Identifier;
  };
  jsx: {
    arrayElements(value: ts.Expression): ts.Expression[];
  };
  type: {
    ref(value: string | ImportReference): ts.TypeReferenceNode;
    union(...types: readonly ts.TypeNode[]): ts.UnionTypeNode;
    undefined(): ts.KeywordTypeNode;
  };
}

export interface EditHelpers {
  import: {
    rewrite(rules: Record<string, ImportRule>): CompilerTransform;
  };
  jsx: {
    element(options: JsxElementEditOptions): CompilerTransform;
    attribute(options: JsxAttributeEditOptions): CompilerTransform;
    childAsProp(prop: string): JsxElementEdit;
    addAttribute(name: string, value?: string | ts.Expression | undefined): JsxElementEdit;
  };
  interface: {
    property(options: InterfacePropertyEditOptions): CompilerTransform;
    setType(type: (context: InterfacePropertyContext) => ts.TypeNode): InterfacePropertyEdit;
  };
}

export interface TransformHelpers {
  ref: RefHelpers;
  match: MatchHelpers;
  create: CreateHelpers;
  edit: EditHelpers;
}

export type TransformStep = CompilerTransform | CompilerPlugin | null | undefined | false;
export type TransformCallback = (helpers: TransformHelpers) => readonly TransformStep[];

export interface TransformOptions {
  name?: string | undefined;
  enforce?: 'pre' | 'post' | undefined;
}

export interface JsxElementContext {
  factory: ts.NodeFactory;
}

export type JsxElementEdit = (element: JsxElementLike, context: JsxElementContext) => JsxElementLike | undefined;

export interface JsxElementEditOptions {
  match: MatchPredicate;
  transform: JsxElementEdit;
}

export interface JsxAttributeContext {
  element: JsxElementLike;
  attribute: ts.JsxAttribute;
  value: ts.Expression;
  factory: ts.NodeFactory;
}

export interface JsxAttributeEditOptions {
  match: MatchPredicate;
  transform(context: JsxAttributeContext): ts.Expression | undefined;
}

export interface InterfacePropertyContext {
  interface: ts.InterfaceDeclaration;
  property: ts.PropertySignature;
  factory: ts.NodeFactory;
}

export type InterfacePropertyEdit = (context: InterfacePropertyContext) => ts.PropertySignature | undefined;

export interface InterfacePropertyEditOptions {
  match: MatchPredicate;
  transform: InterfacePropertyEdit;
}

interface MutableImportReference extends ImportReference {
  used: boolean;
}

const IMPORT_REF_SYMBOL = Symbol('@videojs/compiler/import-ref');

export function transform(callback: TransformCallback, options: TransformOptions = {}): CompilerPlugin {
  return {
    name: options.name ?? 'transform',
    ...(options.enforce ? { enforce: options.enforce } : {}),
    async setup(context) {
      const refs: MutableImportReference[] = [];
      const helpers = createTransformHelpers(refs, context);
      const steps = callback(helpers).filter(Boolean) as Array<CompilerTransform | CompilerPlugin>;
      const transforms: CompilerTransform[] = [];
      const finishers: Array<() => void | Promise<void>> = [];

      for (const step of steps) {
        if (isCompilerPlugin(step)) {
          const nested = await step.setup?.(context);
          if (nested?.transform) transforms.push(nested.transform);
          if (nested?.finish) finishers.push(nested.finish);
          continue;
        }
        transforms.push(step);
      }

      transforms.push(materializeImportRefs(refs, context));

      const pipeline: CompilerPipelineStep = {
        transform: pipeTransforms(transforms),
      };
      if (finishers.length > 0) {
        pipeline.finish = async () => {
          for (const finish of finishers) await finish();
        };
      }
      return pipeline;
    },
  };
}

function createTransformHelpers(refs: MutableImportReference[], context: CompilerContext): TransformHelpers {
  const ref: RefHelpers = {
    import(source, name, options = {}) {
      const next = {
        [IMPORT_REF_SYMBOL]: true,
        source,
        name,
        type: options.type,
        used: false,
      } as MutableImportReference;
      refs.push(next);
      return next;
    },
  };

  const match = createMatchHelpers();
  const create = createCreateHelpers();
  const edit = createEditHelpers(context);

  return { ref, match, create, edit };
}

function createMatchHelpers(): MatchHelpers {
  return {
    all:
      (...predicates) =>
      (value, context) =>
        predicates.every((predicate) => predicate(value, context)),
    jsx: {
      tag: (name) => (value, context) => {
        const element = readJsxElement(value, context);
        if (!element) return false;
        const current = tagName(element);
        return typeof name === 'string' ? current === name : name.test(current);
      },
      attribute: (name) => (value, context) => {
        const attr = readJsxAttribute(value, context);
        return Boolean(attr && ts.isIdentifier(attr.name) && attr.name.text === name);
      },
      value: {
        array: () => (value, context) => {
          const expression = readJsxAttributeValue(value, context);
          return Boolean(expression && ts.isArrayLiteralExpression(expression));
        },
      },
    },
    interface: {
      name: (name) => (value, context) => {
        const declaration = readInterface(value, context);
        if (!declaration) return false;
        return typeof name === 'string' ? declaration.name.text === name : name.test(declaration.name.text);
      },
      property: (name) => (value, context) => {
        const property = readInterfaceProperty(value, context);
        return Boolean(property && ts.isIdentifier(property.name) && property.name.text === name);
      },
    },
  };
}

function createCreateHelpers(): CreateHelpers {
  return {
    expr: {
      call(callee, args) {
        return ts.factory.createCallExpression(expressionFromReference(callee), undefined, [...args]);
      },
      identifier(value) {
        if (isImportReference(value)) value.used = true;
        return ts.factory.createIdentifier(typeof value === 'string' ? value : value.name);
      },
    },
    jsx: {
      arrayElements(value) {
        if (!ts.isArrayLiteralExpression(value)) return [];
        return value.elements.filter((item): item is ts.Expression => !ts.isSpreadElement(item));
      },
    },
    type: {
      ref(value) {
        if (isImportReference(value)) value.used = true;
        return ts.factory.createTypeReferenceNode(typeof value === 'string' ? value : value.name);
      },
      union(...types) {
        return ts.factory.createUnionTypeNode([...types]);
      },
      undefined() {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
      },
    },
  };
}

function createEditHelpers(context: CompilerContext): EditHelpers {
  return {
    import: {
      rewrite(rules) {
        const options: ImportRewriteOptions = {
          rules,
          configDir: context.configDir,
          ...(context.outputFile ? { outputFile: context.outputFile } : {}),
        };
        return transformImports(options);
      },
    },
    jsx: {
      element: editJsxElement,
      attribute: editJsxAttribute,
      childAsProp:
        (prop) =>
        (element, { factory }) =>
          liftSingleChildToProp(element, prop, factory),
      addAttribute:
        (name, value) =>
        (element, { factory }) =>
          addJsxAttribute(element, name, value, factory),
    },
    interface: {
      property: editInterfaceProperty,
      setType: (type) => (propertyContext) => {
        const factory = propertyContext.factory;
        return factory.updatePropertySignature(
          propertyContext.property,
          propertyContext.property.modifiers,
          propertyContext.property.name,
          propertyContext.property.questionToken,
          type(propertyContext)
        );
      },
    },
  };
}

function expressionFromReference(value: string | ImportReference | ts.Expression): ts.Expression {
  if (typeof value === 'string') return ts.factory.createIdentifier(value);
  if (isImportReference(value)) {
    value.used = true;
    return ts.factory.createIdentifier(value.name);
  }
  if (isNode(value) && ts.isExpression(value)) return value;
  throw new TypeError('Expected an expression or import reference.');
}

function editJsxElement(options: JsxElementEditOptions): CompilerTransform {
  return (context) => {
    const visit = (node: ts.Node): ts.Node => {
      const next = ts.visitEachChild(node, visit, context);
      if (!isJsxElementLike(next)) return next;
      if (!options.match(next, { element: next })) return next;
      return options.transform(next, { factory: context.factory }) ?? next;
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function editJsxAttribute(options: JsxAttributeEditOptions): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.Node => {
      const next = ts.visitEachChild(node, visit, context);
      if (!isJsxElementLike(next)) return next;

      const attrs = ts.isJsxElement(next) ? next.openingElement.attributes : next.attributes;
      let changed = false;
      const properties = attrs.properties.map((property) => {
        if (!ts.isJsxAttribute(property)) return property;
        const value = readAttributeExpression(property);
        if (!value) return property;
        const attributeContext: JsxAttributeContext = { element: next, attribute: property, value, factory };
        if (!options.match(property, attributeContext)) return property;
        const replacement = options.transform(attributeContext);
        if (!replacement) return property;
        changed = true;
        return factory.updateJsxAttribute(
          property,
          property.name,
          ts.isStringLiteral(replacement) ? replacement : factory.createJsxExpression(undefined, replacement)
        );
      });

      if (!changed) return next;

      const nextAttrs = factory.updateJsxAttributes(attrs, properties);
      if (ts.isJsxElement(next)) {
        return factory.updateJsxElement(
          next,
          factory.updateJsxOpeningElement(
            next.openingElement,
            next.openingElement.tagName,
            next.openingElement.typeArguments,
            nextAttrs
          ),
          next.children,
          next.closingElement
        );
      }

      return factory.updateJsxSelfClosingElement(next, next.tagName, next.typeArguments, nextAttrs);
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function editInterfaceProperty(options: InterfacePropertyEditOptions): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.Node => {
      const next = ts.visitEachChild(node, visit, context);
      if (!ts.isInterfaceDeclaration(next)) return next;

      let changed = false;
      const members = next.members.map((member) => {
        if (!ts.isPropertySignature(member)) return member;
        const propertyContext: InterfacePropertyContext = { interface: next, property: member, factory };
        if (!options.match(member, propertyContext)) return member;
        const replacement = options.transform(propertyContext);
        if (!replacement) return member;
        changed = true;
        return replacement;
      });

      if (!changed) return next;
      return factory.updateInterfaceDeclaration(
        next,
        next.modifiers,
        next.name,
        next.typeParameters,
        next.heritageClauses,
        members
      );
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function materializeImportRefs(refs: readonly MutableImportReference[], context: CompilerContext): CompilerTransform {
  return (transformContext) => {
    const factory = transformContext.factory;
    return (sourceFile) => {
      let result = sourceFile;
      for (const ref of refs) {
        if (!ref.used) continue;
        result = addNamedImport(result, { source: ref.source, name: ref.name, type: ref.type }, factory, context);
      }
      return result;
    };
  };
}

function pipeTransforms(transforms: readonly CompilerTransform[]): CompilerTransform {
  return (context) => {
    return (sourceFile) => {
      let current = sourceFile;
      for (const createTransform of transforms) {
        current = createTransform(context)(current) as ts.SourceFile;
      }
      return current;
    };
  };
}

function liftSingleChildToProp(
  element: JsxElementLike,
  prop: string,
  factory: ts.NodeFactory
): JsxElementLike | undefined {
  if (!ts.isJsxElement(element)) return undefined;
  const opening = element.openingElement;
  if (hasAttribute(opening.attributes, prop)) return undefined;

  const child = singleElementChild(element.children);
  if (!child) return undefined;

  const nextAttrs = factory.createJsxAttributes([
    ...opening.attributes.properties,
    factory.createJsxAttribute(factory.createIdentifier(prop), factory.createJsxExpression(undefined, child)),
  ]);

  return factory.createJsxSelfClosingElement(opening.tagName, opening.typeArguments, nextAttrs);
}

function addJsxAttribute(
  element: JsxElementLike,
  name: string,
  value: string | ts.Expression | undefined,
  factory: ts.NodeFactory
): JsxElementLike | undefined {
  const attrs = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
  if (hasAttribute(attrs, name)) return undefined;

  const initializer =
    value === undefined
      ? undefined
      : typeof value === 'string'
        ? factory.createStringLiteral(value)
        : factory.createJsxExpression(undefined, value);
  const nextAttrs = factory.createJsxAttributes([
    ...attrs.properties,
    factory.createJsxAttribute(factory.createIdentifier(name), initializer),
  ]);

  if (ts.isJsxElement(element)) {
    return factory.updateJsxElement(
      element,
      factory.updateJsxOpeningElement(
        element.openingElement,
        element.openingElement.tagName,
        element.openingElement.typeArguments,
        nextAttrs
      ),
      element.children,
      element.closingElement
    );
  }

  return factory.updateJsxSelfClosingElement(element, element.tagName, element.typeArguments, nextAttrs);
}

function singleElementChild(
  children: readonly ts.JsxChild[]
): ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | null {
  let found: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | null = null;
  for (const child of children) {
    if (ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces) continue;
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
      if (found) return null;
      found = child;
      continue;
    }
    return null;
  }
  return found;
}

function hasAttribute(attrs: ts.JsxAttributes, name: string): boolean {
  return attrs.properties.some(
    (property) => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name
  );
}

function readAttributeExpression(attribute: ts.JsxAttribute): ts.Expression | undefined {
  const init = attribute.initializer;
  if (!init) return undefined;
  if (ts.isStringLiteral(init)) return init;
  if (ts.isJsxExpression(init) && init.expression) return init.expression;
  return undefined;
}

function readJsxElement(value: unknown, context: unknown): JsxElementLike | undefined {
  if (isJsxElementLike(value)) return value;
  if (isObject(context) && isJsxElementLike(context.element)) return context.element;
  return undefined;
}

function readJsxAttribute(value: unknown, context: unknown): ts.JsxAttribute | undefined {
  if (isJsxAttribute(value)) return value;
  if (isObject(context) && isJsxAttribute(context.attribute)) return context.attribute;
  return undefined;
}

function readJsxAttributeValue(value: unknown, context: unknown): ts.Expression | undefined {
  if (isObject(context) && isNode(context.value) && ts.isExpression(context.value)) return context.value;
  const attribute = readJsxAttribute(value, context);
  return attribute ? readAttributeExpression(attribute) : undefined;
}

function readInterface(value: unknown, context: unknown): ts.InterfaceDeclaration | undefined {
  if (isNode(value) && ts.isInterfaceDeclaration(value)) return value;
  if (isObject(context) && isNode(context.interface) && ts.isInterfaceDeclaration(context.interface)) {
    return context.interface as ts.InterfaceDeclaration;
  }
  return undefined;
}

function readInterfaceProperty(value: unknown, context: unknown): ts.PropertySignature | undefined {
  if (isNode(value) && ts.isPropertySignature(value)) return value;
  if (isObject(context) && isNode(context.property) && ts.isPropertySignature(context.property)) {
    return context.property as ts.PropertySignature;
  }
  return undefined;
}

function isJsxElementLike(value: unknown): value is JsxElementLike {
  return Boolean(isNode(value) && (ts.isJsxElement(value) || ts.isJsxSelfClosingElement(value)));
}

function isJsxAttribute(value: unknown): value is ts.JsxAttribute {
  return Boolean(isNode(value) && ts.isJsxAttribute(value));
}

function isCompilerPlugin(value: CompilerTransform | CompilerPlugin): value is CompilerPlugin {
  return isObject(value) && typeof value.name === 'string';
}

function isImportReference(value: unknown): value is MutableImportReference {
  return Boolean(isObject(value) && value[IMPORT_REF_SYMBOL] === true);
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNode(value: unknown): value is ts.Node {
  return isObject(value) && typeof value.kind === 'number';
}
