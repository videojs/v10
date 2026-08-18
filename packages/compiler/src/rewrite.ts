import ts from 'typescript';
import type { CompilerContext, CompilerPipelineStep, CompilerPlugin, CompilerTransform } from './config';
import type { JsxElementLike } from './jsx';
import { tagName, unwrap as unwrapJsxElement } from './jsx';
import { moveJsxChildToProp, replaceJsxElementTag, setJsxAttribute } from './jsx/edits';
import { addNamedImport } from './transforms/add-import';
import { type ImportRewriteOptions, type ImportRule, transformImports } from './transforms/imports';
import {
  createIndexedAccessType,
  createInterfaceDeclaration,
  createLiteralType,
  createNamedType,
  type InterfaceDeclarationOptions,
} from './utils/declarations';
import {
  hasJsxSpreadAttribute,
  isJsxElementLike as isJsxNodeLike,
  readAccessPath,
  readJsxAttributeExpression,
} from './utils/jsx';
import { insertStatementsAfterImports } from './utils/source-file';

export interface ImportReference {
  readonly source: string;
  readonly name: string;
  readonly default?: boolean | undefined;
  readonly type?: boolean | undefined;
}

export interface ImportOptions {
  default?: boolean | undefined;
  type?: boolean | undefined;
}

export interface RefHelpers {
  import(source: string, name: string, options?: ImportOptions): ImportReference;
}

export type ValueReference = string | ImportReference | ts.Expression;
export type JsxPropValue = string | ImportReference | ts.Expression | undefined;
export type JsxPropValueFactory = (context: JsxElementContext) => JsxPropValue;
export type JsxPropInput = JsxPropValue | JsxPropValueFactory;
export type JsxPropsSpec = readonly (ts.JsxAttribute | ts.JsxSpreadAttribute)[] | Record<string, JsxPropValue>;

export interface ValueOnlyIfOptions {
  value: ValueReference;
  condition: ValueReference;
  fallback?: ValueReference | undefined;
}

export type MatchPredicate<Value = unknown, Context = unknown> = (value: Value, context?: Context) => boolean;

export interface MatchHelpers {
  all(...predicates: readonly MatchPredicate[]): MatchPredicate;
  value: {
    array(): MatchPredicate;
  };
  jsx: {
    tag(name: string | RegExp): MatchPredicate;
    prop(name: string): MatchPredicate;
  };
  interface: {
    name(name: string | RegExp): MatchPredicate;
    property(name: string): MatchPredicate;
  };
  function: {
    name(name: string | RegExp): MatchPredicate;
  };
}

export interface CreateHelpers {
  value: {
    and(left: ValueReference, right: ts.Expression): ts.BinaryExpression;
    array(items: readonly ValueReference[], options?: ValueArrayOptions): ts.ArrayLiteralExpression | ts.AsExpression;
    arrayItems(value: ts.Expression): ts.Expression[];
    arrow(parameters: readonly string[], body: ts.ConciseBody): ts.ArrowFunction;
    call(callee: ValueReference, args: readonly ValueReference[]): ts.CallExpression;
    conditional(test: ts.Expression, whenTrue: ts.Expression, whenFalse: ts.Expression): ts.ConditionalExpression;
    equal(left: ValueReference, right: ValueReference): ts.BinaryExpression;
    identifier(value: string | ImportReference): ts.Identifier;
    number(value: number): ts.NumericLiteral;
    object(properties?: readonly ts.ObjectLiteralElementLike[]): ts.ObjectLiteralExpression;
    onlyIf(options: ValueOnlyIfOptions): ts.ConditionalExpression;
    string(value: string): ts.StringLiteral;
    typeOf(value: ValueReference): ts.TypeOfExpression;
    undefined(): ts.Identifier;
  };
  jsx: {
    element(tag: string | ImportReference, props?: JsxPropsSpec): ts.JsxSelfClosingElement;
    expression(value: ts.Expression): ts.JsxExpression;
    prop(name: string, value?: JsxPropValue): ts.JsxAttribute;
    renderIf(test: ValueReference, element: ts.Expression): ts.JsxExpression;
    spreadProps(value: ValueReference): ts.JsxSpreadAttribute;
  };
  type: {
    indexed(object: ts.TypeNode, index: ts.TypeNode): ts.IndexedAccessTypeNode;
    literal(value: string | number | boolean): ts.LiteralTypeNode;
    named(value: string | ImportReference, typeArguments?: readonly ts.TypeNode[]): ts.TypeReferenceNode;
    string(): ts.KeywordTypeNode;
    union(...types: readonly ts.TypeNode[]): ts.UnionTypeNode;
    unknown(): ts.KeywordTypeNode;
    undefined(): ts.KeywordTypeNode;
  };
}

export interface EditHelpers {
  import: {
    rewrite(rules: Record<string, ImportRule>): CompilerTransform;
  };
  jsx: {
    element(options: JsxElementEditOptions): CompilerTransform;
    prop(options: JsxPropEditOptions): CompilerTransform;
    addProp(name: string, value?: JsxPropInput): JsxElementEdit;
    addPropsSpread(value: ValueReference, options?: JsxSpreadPropsOptions): JsxElementEdit;
    makeSelfClosing(): JsxElementEdit;
    moveChildToProp(prop: string): JsxElementEdit;
    replaceTag(tag: string | ImportReference): JsxElementEdit;
  };
  interface: {
    declaration(options: InterfaceDeclarationEditOptions): CompilerTransform;
    extends(value: string | ImportReference): InterfaceDeclarationEdit;
    replaceExtends(from: string | RegExp, to: string | ImportReference): InterfaceDeclarationEdit;
    property(options: InterfacePropertyEditOptions): CompilerTransform;
    setType(type: (context: InterfacePropertyContext) => ts.TypeNode): InterfacePropertyEdit;
  };
  function: {
    declaration(options: FunctionDeclarationEditOptions): CompilerTransform;
    addProps(props: readonly FunctionPropSpec[], parameterIndex?: number): FunctionDeclarationEdit;
    setProps(props: readonly FunctionPropSpec[], options?: FunctionPropsOptions): FunctionDeclarationEdit;
  };
}

export interface ValueHelpers {
  and(left: ValueReference, right: ts.Expression): ts.BinaryExpression;
  array(items: readonly ValueReference[], options?: ValueArrayOptions): ts.ArrayLiteralExpression | ts.AsExpression;
  arrayItems(value: ts.Expression): ts.Expression[];
  arrow(parameters: readonly string[], body: ts.ConciseBody): ts.ArrowFunction;
  call(callee: ValueReference, args: readonly ValueReference[]): ts.CallExpression;
  conditional(test: ts.Expression, whenTrue: ts.Expression, whenFalse: ts.Expression): ts.ConditionalExpression;
  equal(left: ValueReference, right: ValueReference): ts.BinaryExpression;
  identifier(value: string | ImportReference): ts.Identifier;
  isArray(): MatchPredicate;
  number(value: number): ts.NumericLiteral;
  object(properties?: readonly ts.ObjectLiteralElementLike[]): ts.ObjectLiteralExpression;
  string(value: string): ts.StringLiteral;
  typeOf(value: ValueReference): ts.TypeOfExpression;
  when(
    value: ValueReference,
    condition: ValueReference,
    fallback?: ValueReference | undefined
  ): ts.ConditionalExpression;
  undefined(): ts.Identifier;
}

export interface JsxHelpers {
  create(tag: string | ImportReference, props?: JsxPropsSpec): ts.JsxSelfClosingElement;
  element(tag: string | RegExp): JsxElementSelection;
  expression(value: ts.Expression): ts.JsxExpression;
  if(test: ValueReference, element: ts.Expression): ts.JsxExpression;
  props(name: string): JsxPropsSelection;
}

export interface ScopedJsxHelpers {
  element(tag: string | RegExp): ScopedJsxElementSelection;
  props(name: string): JsxPropsSelection;
}

export interface ValueArrayOptions {
  asConst?: boolean | undefined;
}

export interface JsxElementSelection {
  addProp(name: string, value?: JsxPropInput): CompilerTransform;
  childToProp(prop: string): CompilerTransform;
  remove(): CompilerTransform;
  replace(replacement: string | ImportReference | JsxElementReplacement): CompilerTransform;
  selfClosing(): CompilerTransform;
  spreadProps(value: ValueReference, options?: JsxSpreadPropsOptions): CompilerTransform;
  unwrap(options?: JsxElementUnwrapOptions): CompilerTransform;
}

export type ScopedJsxElementSelection = Omit<JsxElementSelection, 'unwrap'>;

export interface JsxSpreadPropsOptions {
  position?: 'start' | 'end' | undefined;
}

export interface JsxElementUnwrapOptions {
  /** Forward wrapper props to exactly one matching direct child. */
  forwardPropsTo?: string | RegExp | undefined;
}

export type JsxElementReplacement = (context: JsxElementContext) => ts.Node | undefined;

export interface JsxPropsSelection {
  on(tag: string | RegExp): JsxPropsSelection;
  rename(name: string): CompilerTransform;
  replace(transform: (context: JsxPropContext) => ts.Expression | undefined): CompilerTransform;
  where(predicate: MatchPredicate): JsxPropsSelection;
}

export interface TypeHelpers {
  indexed(object: ts.TypeNode, index: ts.TypeNode): ts.IndexedAccessTypeNode;
  literal(value: string | number | boolean): ts.LiteralTypeNode;
  named(value: string | ImportReference, typeArguments?: readonly ts.TypeNode[]): ts.TypeReferenceNode;
  string(): ts.KeywordTypeNode;
  union(...types: readonly ts.TypeNode[]): ts.UnionTypeNode;
  unknown(): ts.KeywordTypeNode;
  undefined(): ts.KeywordTypeNode;
}

export interface InterfaceSelection {
  extends(value: string | ImportReference): CompilerTransform;
  property(name: string): InterfacePropertySelection;
  replaceExtends(from: string | RegExp, to: string | ImportReference): CompilerTransform;
}

export interface InterfacePropertySelection {
  setType(type: (context: InterfacePropertyContext) => ts.TypeNode): CompilerTransform;
}

export interface FunctionSelection {
  readonly jsx: ScopedJsxHelpers;
  addProps(props: readonly FunctionPropSpec[], parameterIndex?: number): CompilerTransform;
  insertBefore(statements: FunctionSiblingStatementSpec): CompilerTransform;
  setProps(props: readonly FunctionPropSpec[], options?: FunctionPropsOptions): CompilerTransform;
  append(statements: StatementSpec): CompilerTransform;
  beforeReturn(statements: StatementSpec): CompilerTransform;
  prepend(statements: StatementSpec): CompilerTransform;
}

export interface ModuleSelection {
  append(statements: StatementSpec): CompilerTransform;
  prepend(statements: StatementSpec): CompilerTransform;
}

export interface VariableSelection {
  remove(): CompilerTransform;
}

export interface StatementHelpers {
  const(name: string, initializer: ValueReference, options?: ConstStatementOptions): ts.VariableStatement;
  interface(options: InterfaceDeclarationOptions): ts.InterfaceDeclaration;
}

export interface ConstStatementOptions {
  asConst?: boolean | undefined;
  export?: boolean | undefined;
  type?: ts.TypeNode | undefined;
}

export type StatementSpec = ts.Statement | readonly ts.Statement[];
export type FunctionSiblingStatementSpec = StatementSpec | ((context: FunctionDeclarationContext) => StatementSpec);

export interface TransformHelpers {
  import(source: string, name: string, options?: ImportOptions): ImportReference;
  imports(rules: Record<string, ImportRule>): CompilerTransform;
  function(name: string | RegExp): FunctionSelection;
  interface(name: string | RegExp): InterfaceSelection;
  jsx: JsxHelpers;
  module: ModuleSelection;
  statement: StatementHelpers;
  type: TypeHelpers;
  value: ValueHelpers;
  variable(name: string | RegExp): VariableSelection;
}

export type TransformStep = CompilerTransform | CompilerPlugin | null | undefined | false;
export type RewriteCallback = (helpers: TransformHelpers) => readonly TransformStep[];

export interface RewriteOptions {
  name?: string | undefined;
  enforce?: 'pre' | 'post' | undefined;
}

export interface JsxElementContext {
  element: JsxElementLike;
  factory: ts.NodeFactory;
  tagName: string;
}

export type JsxElementEdit = (element: JsxElementLike, context: JsxElementContext) => ts.Node | undefined;

export interface JsxElementEditOptions {
  when: MatchPredicate;
  remove?: boolean | undefined;
  withinFunction?: MatchPredicate | undefined;
  transform: JsxElementEdit;
}

export interface JsxPropContext {
  element: JsxElementLike;
  prop: ts.JsxAttribute;
  value: ts.Expression;
  factory: ts.NodeFactory;
}

export interface JsxPropEditOptions {
  when: MatchPredicate;
  withinFunction?: MatchPredicate | undefined;
  transform(context: JsxPropContext): ts.Expression | undefined;
}

export interface InterfacePropertyContext {
  interface: ts.InterfaceDeclaration;
  property: ts.PropertySignature;
  factory: ts.NodeFactory;
}

export interface InterfaceDeclarationContext {
  interface: ts.InterfaceDeclaration;
  factory: ts.NodeFactory;
}

export type InterfaceDeclarationEdit = (context: InterfaceDeclarationContext) => ts.InterfaceDeclaration | undefined;

export interface InterfaceDeclarationEditOptions {
  when: MatchPredicate;
  transform: InterfaceDeclarationEdit;
}

export type InterfacePropertyEdit = (context: InterfacePropertyContext) => ts.PropertySignature | undefined;

export interface InterfacePropertyEditOptions {
  when: MatchPredicate;
  transform: InterfacePropertyEdit;
}

export interface FunctionDeclarationContext {
  function: ts.FunctionDeclaration;
  factory: ts.NodeFactory;
}

export type FunctionDeclarationEdit = (context: FunctionDeclarationContext) => ts.FunctionDeclaration | undefined;

export interface FunctionDeclarationEditOptions {
  when: MatchPredicate;
  transform: FunctionDeclarationEdit;
}

export type FunctionPropSpec = string | { name: string; spread?: boolean | undefined };

export interface FunctionPropsOptions {
  parameterIndex?: number | undefined;
  type?: string | ImportReference | ts.TypeNode | undefined;
  initializer?: ts.Expression | undefined;
}

interface MutableImportReference extends ImportReference {
  used: boolean;
}

const IMPORT_REF_SYMBOL = Symbol('@videojs/compiler/import-ref');

export function rewrite(callback: RewriteCallback, options: RewriteOptions = {}): CompilerPlugin {
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
        default: options.default,
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
  const statement = createStatementHelpers();
  const value = createValueHelpers(match, create);

  return {
    import: ref.import,
    imports: (rules) => edit.import.rewrite(rules),
    function: (name) => createFunctionSelection(name, match, edit),
    interface: (name) => createInterfaceSelection(name, match, edit),
    jsx: createJsxHelpers(match, create, edit),
    module: createModuleSelection(),
    statement,
    type: create.type,
    value,
    variable: (name) => ({ remove: () => removeVariableDeclarations(name) }),
  };
}

function createValueHelpers(match: MatchHelpers, create: CreateHelpers): ValueHelpers {
  return {
    and: create.value.and,
    array: create.value.array,
    arrayItems: create.value.arrayItems,
    arrow: create.value.arrow,
    call: create.value.call,
    conditional: create.value.conditional,
    equal: create.value.equal,
    identifier: create.value.identifier,
    isArray: match.value.array,
    number: create.value.number,
    object: create.value.object,
    string: create.value.string,
    typeOf: create.value.typeOf,
    when(value, condition, fallback) {
      return create.value.onlyIf({ value, condition, ...(fallback === undefined ? {} : { fallback }) });
    },
    undefined: create.value.undefined,
  };
}

function createStatementHelpers(): StatementHelpers {
  return {
    const(name, initializer, options = {}) {
      const modifiers = options.export ? [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)] : undefined;
      const expression = options.asConst ? asConst(valueFromReference(initializer)) : valueFromReference(initializer);

      return ts.factory.createVariableStatement(
        modifiers,
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(name),
              undefined,
              options.type,
              expression
            ),
          ],
          ts.NodeFlags.Const
        )
      );
    },
    interface: (options) => createInterfaceDeclaration(options),
  };
}

function createModuleSelection(): ModuleSelection {
  return {
    append: (statements) => editModuleStatements('append', statements),
    prepend: (statements) => editModuleStatements('prepend', statements),
  };
}

function createJsxHelpers(match: MatchHelpers, create: CreateHelpers, edit: EditHelpers): JsxHelpers {
  return {
    create: create.jsx.element,
    element: (tag) => createJsxElementSelection(tag, match, edit),
    expression: create.jsx.expression,
    if: create.jsx.renderIf,
    props: (name) => createJsxPropsSelection(name, match, edit),
  };
}

function createScopedJsxHelpers(
  match: MatchHelpers,
  edit: EditHelpers,
  withinFunction: MatchPredicate
): ScopedJsxHelpers {
  return {
    element: (tag) => createJsxElementSelection(tag, match, edit, withinFunction),
    props: (name) => createJsxPropsSelection(name, match, edit, [], withinFunction),
  };
}

function createJsxElementSelection(
  tag: string | RegExp,
  match: MatchHelpers,
  edit: EditHelpers,
  withinFunction?: MatchPredicate
): JsxElementSelection {
  const when = match.jsx.tag(tag);
  return {
    addProp: (name, value) => edit.jsx.element({ when, transform: edit.jsx.addProp(name, value), withinFunction }),
    childToProp: (prop) => edit.jsx.element({ when, transform: edit.jsx.moveChildToProp(prop), withinFunction }),
    remove: () => edit.jsx.element({ when, transform: () => undefined, remove: true, withinFunction }),
    replace(replacement) {
      const transform: JsxElementEdit =
        typeof replacement === 'function'
          ? (_element, context) => replacement(context)
          : edit.jsx.replaceTag(replacement);
      return edit.jsx.element({ when, transform, withinFunction });
    },
    selfClosing: () => edit.jsx.element({ when, transform: edit.jsx.makeSelfClosing(), withinFunction }),
    spreadProps: (value, options) =>
      edit.jsx.element({ when, transform: edit.jsx.addPropsSpread(value, options), withinFunction }),
    unwrap(options = {}) {
      if (withinFunction) throw new Error('Function-scoped JSX unwrap is not supported.');
      return unwrapJsxElement({
        match: when,
        ...(options.forwardPropsTo ? { forwardPropsTo: match.jsx.tag(options.forwardPropsTo) } : {}),
      });
    },
  };
}

function createJsxPropsSelection(
  name: string,
  match: MatchHelpers,
  edit: EditHelpers,
  predicates: readonly MatchPredicate[] = [],
  withinFunction?: MatchPredicate
): JsxPropsSelection {
  const when = match.all(match.jsx.prop(name), ...predicates);
  return {
    on: (tag) => createJsxPropsSelection(name, match, edit, [...predicates, match.jsx.tag(tag)], withinFunction),
    rename: (nextName) => renameJsxProps(when, nextName, withinFunction),
    replace: (transform) => edit.jsx.prop({ when, transform, withinFunction }),
    where: (predicate) => createJsxPropsSelection(name, match, edit, [...predicates, predicate], withinFunction),
  };
}

function renameJsxProps(when: MatchPredicate, name: string, withinFunction?: MatchPredicate): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node, active: boolean): ts.VisitResult<ts.Node | undefined> => {
      const scoped = functionScope(node, active, withinFunction, factory);
      const next = ts.visitEachChild(node, (child) => visit(child, scoped), context);
      if (!scoped) return next;
      if (!isJsxNodeLike(next)) return next;

      const attrs = ts.isJsxElement(next) ? next.openingElement.attributes : next.attributes;
      let changed = false;
      const properties = attrs.properties.map((property) => {
        if (!ts.isJsxAttribute(property)) return property;
        if (!when(property, { element: next, prop: property, factory })) return property;
        changed = true;
        return factory.updateJsxAttribute(property, factory.createIdentifier(name), property.initializer);
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

    return (sourceFile) => ts.visitEachChild(sourceFile, (node) => visit(node, withinFunction === undefined), context);
  };
}

function createInterfaceSelection(name: string | RegExp, match: MatchHelpers, edit: EditHelpers): InterfaceSelection {
  const when = match.interface.name(name);
  return {
    extends: (value) => edit.interface.declaration({ when, transform: edit.interface.extends(value) }),
    property: (property) => ({
      setType: (type) =>
        edit.interface.property({
          when: match.all(when, match.interface.property(property)),
          transform: edit.interface.setType(type),
        }),
    }),
    replaceExtends: (from, to) =>
      edit.interface.declaration({ when, transform: edit.interface.replaceExtends(from, to) }),
  };
}

function createFunctionSelection(name: string | RegExp, match: MatchHelpers, edit: EditHelpers): FunctionSelection {
  const when = match.function.name(name);
  return {
    jsx: createScopedJsxHelpers(match, edit, when),
    addProps: (props, parameterIndex) =>
      edit.function.declaration({ when, transform: edit.function.addProps(props, parameterIndex) }),
    insertBefore: (statements) => insertStatementsBeforeFunction(when, statements),
    setProps: (props, options) =>
      edit.function.declaration({ when, transform: edit.function.setProps(props, options) }),
    append: (statements) =>
      edit.function.declaration({
        when,
        transform: ({ function: declaration, factory }) => editFunctionBody(declaration, 'append', statements, factory),
      }),
    beforeReturn: (statements) =>
      edit.function.declaration({
        when,
        transform: ({ function: declaration, factory }) =>
          editFunctionBody(declaration, 'beforeReturn', statements, factory),
      }),
    prepend: (statements) =>
      edit.function.declaration({
        when,
        transform: ({ function: declaration, factory }) =>
          editFunctionBody(declaration, 'prepend', statements, factory),
      }),
  };
}

function createMatchHelpers(): MatchHelpers {
  return {
    all:
      (...predicates) =>
      (value, context) =>
        predicates.every((predicate) => predicate(value, context)),
    value: {
      array: () => (value, context) => {
        const expression = readJsxPropValue(value, context);
        return Boolean(expression && ts.isArrayLiteralExpression(expression));
      },
    },
    jsx: {
      tag: (name) => (value, context) => {
        const element = readJsxElement(value, context);
        if (!element) return false;
        const current = tagName(element);
        return typeof name === 'string' ? current === name : name.test(current);
      },
      prop: (name) => (value, context) => {
        const attr = readJsxProp(value, context);
        return Boolean(attr && ts.isIdentifier(attr.name) && attr.name.text === name);
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
    function: {
      name: (name) => (value, context) => {
        const declaration = readFunctionDeclaration(value, context);
        if (!declaration?.name) return false;
        return typeof name === 'string' ? declaration.name.text === name : name.test(declaration.name.text);
      },
    },
  };
}

function createCreateHelpers(): CreateHelpers {
  return {
    value: {
      and(left, right) {
        return ts.factory.createBinaryExpression(
          valueFromReference(left),
          ts.factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
          right
        );
      },
      array(items, options = {}) {
        const array = ts.factory.createArrayLiteralExpression(items.map(valueFromReference));
        return options.asConst ? asConst(array) : array;
      },
      arrayItems(value) {
        if (!ts.isArrayLiteralExpression(value)) return [];
        return value.elements.filter((item): item is ts.Expression => !ts.isSpreadElement(item));
      },
      arrow(parameters, body) {
        return ts.factory.createArrowFunction(
          undefined,
          undefined,
          parameters.map((name) => ts.factory.createParameterDeclaration(undefined, undefined, name)),
          undefined,
          ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          body
        );
      },
      call(callee, args) {
        return ts.factory.createCallExpression(valueFromReference(callee), undefined, args.map(valueFromReference));
      },
      conditional(test, whenTrue, whenFalse) {
        return ts.factory.createConditionalExpression(
          test,
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          whenTrue,
          ts.factory.createToken(ts.SyntaxKind.ColonToken),
          whenFalse
        );
      },
      equal(left, right) {
        return ts.factory.createBinaryExpression(
          valueFromReference(left),
          ts.factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
          valueFromReference(right)
        );
      },
      identifier(value) {
        if (isImportReference(value)) value.used = true;
        return ts.factory.createIdentifier(typeof value === 'string' ? value : value.name);
      },
      number(value) {
        return ts.factory.createNumericLiteral(value);
      },
      object(properties = []) {
        return ts.factory.createObjectLiteralExpression([...properties]);
      },
      onlyIf(options) {
        const value = valueFromReference(options.value);
        return ts.factory.createConditionalExpression(
          ts.factory.createCallExpression(valueFromReference(options.condition), undefined, [value]),
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          value,
          ts.factory.createToken(ts.SyntaxKind.ColonToken),
          options.fallback === undefined
            ? ts.factory.createIdentifier('undefined')
            : valueFromReference(options.fallback)
        );
      },
      string(value) {
        return ts.factory.createStringLiteral(value);
      },
      typeOf(value) {
        return ts.factory.createTypeOfExpression(valueFromReference(value));
      },
      undefined() {
        return ts.factory.createIdentifier('undefined');
      },
    },
    jsx: {
      element(tag, props = []) {
        return ts.factory.createJsxSelfClosingElement(
          jsxTagNameFromReference(tag),
          undefined,
          ts.factory.createJsxAttributes(createJsxProps(props, ts.factory))
        );
      },
      expression(value) {
        return ts.factory.createJsxExpression(undefined, value);
      },
      prop(name, value) {
        return createJsxProp(name, value, ts.factory);
      },
      renderIf(test, element) {
        return ts.factory.createJsxExpression(
          undefined,
          ts.factory.createBinaryExpression(
            valueFromReference(test),
            ts.factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
            element
          )
        );
      },
      spreadProps(value) {
        return ts.factory.createJsxSpreadAttribute(valueFromReference(value));
      },
    },
    type: {
      indexed(object, index) {
        return createIndexedAccessType(object, index);
      },
      literal(value) {
        return createLiteralType(value);
      },
      named(value, typeArguments = []) {
        if (isImportReference(value)) value.used = true;
        return createNamedType(typeof value === 'string' ? value : value.name, typeArguments);
      },
      string() {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      },
      union(...types) {
        return ts.factory.createUnionTypeNode([...types]);
      },
      unknown() {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
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
      prop: editJsxProp,
      addProp: (name, value) => (element, elementContext) => {
        const nextValue = typeof value === 'function' ? value(elementContext) : value;
        return setJsxAttribute(
          element,
          name,
          createJsxProp(name, nextValue, elementContext.factory),
          elementContext.factory
        );
      },
      addPropsSpread:
        (value, options) =>
        (element, { factory }) =>
          addJsxPropsSpread(element, value, factory, options),
      makeSelfClosing:
        () =>
        (element, { factory }) =>
          makeJsxElementSelfClosing(element, factory),
      moveChildToProp:
        (prop) =>
        (element, { factory }) =>
          moveJsxChildToProp(element, prop, factory),
      replaceTag:
        (tag) =>
        (element, { factory }) =>
          replaceJsxElementTag(element, jsxTagNameFromReference(tag), factory),
    },
    interface: {
      declaration: editInterfaceDeclaration,
      extends: (value) => (interfaceContext) =>
        addInterfaceExtends(interfaceContext.interface, value, interfaceContext.factory),
      replaceExtends: (from, to) => (interfaceContext) =>
        replaceInterfaceExtends(interfaceContext.interface, from, to, interfaceContext.factory),
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
    function: {
      declaration: editFunctionDeclaration,
      addProps:
        (props, parameterIndex = 0) =>
        (functionContext) =>
          addFunctionProps(functionContext.function, parameterIndex, props, functionContext.factory),
      setProps:
        (props, options = {}) =>
        (functionContext) =>
          setFunctionProps(functionContext.function, props, options, functionContext.factory),
    },
  };
}

function valueFromReference(value: ValueReference): ts.Expression {
  if (typeof value === 'string') return ts.factory.createIdentifier(value);
  if (isImportReference(value)) {
    value.used = true;
    return ts.factory.createIdentifier(value.name);
  }
  if (isNode(value) && ts.isExpression(value)) return value;
  throw new TypeError('Expected an expression or import reference.');
}

function jsxTagNameFromReference(value: string | ImportReference): ts.JsxTagNameExpression {
  if (isImportReference(value)) value.used = true;

  const text = typeof value === 'string' ? value : value.name;
  const parts = text.split('.');
  let current: ts.Identifier | ts.PropertyAccessExpression = ts.factory.createIdentifier(parts[0]!);
  for (const part of parts.slice(1)) {
    current = ts.factory.createPropertyAccessExpression(current, ts.factory.createIdentifier(part));
  }
  return current as ts.JsxTagNameExpression;
}

function expressionFromReference(value: string | ImportReference): ts.Expression {
  return jsxTagNameFromReference(value) as ts.Expression;
}

function editJsxElement(options: JsxElementEditOptions): CompilerTransform {
  return (context) => {
    const factory = context.factory;
    const visit = (node: ts.Node, active: boolean): ts.VisitResult<ts.Node | undefined> => {
      const scoped = functionScope(node, active, options.withinFunction, factory);
      const next = ts.visitEachChild(node, (child) => visit(child, scoped), context);
      if (!scoped) return next;
      if (!isJsxNodeLike(next)) return next;
      const elementContext: JsxElementContext = { element: next, factory, tagName: tagName(next) };
      if (!options.when(next, elementContext)) return next;
      if (options.remove) return undefined;
      return options.transform(next, elementContext) ?? next;
    };

    return (sourceFile) =>
      ts.visitEachChild(sourceFile, (node) => visit(node, options.withinFunction === undefined), context);
  };
}

function editJsxProp(options: JsxPropEditOptions): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node, active: boolean): ts.VisitResult<ts.Node> => {
      const scoped = functionScope(node, active, options.withinFunction, factory);
      const next = ts.visitEachChild(node, (child) => visit(child, scoped), context);
      if (!scoped) return next;
      if (!isJsxNodeLike(next)) return next;

      const attrs = ts.isJsxElement(next) ? next.openingElement.attributes : next.attributes;
      let changed = false;
      const properties = attrs.properties.map((property) => {
        if (!ts.isJsxAttribute(property)) return property;
        const value = readJsxAttributeExpression(property);
        if (!value) return property;
        const propContext: JsxPropContext = { element: next, prop: property, value, factory };
        if (!options.when(property, propContext)) return property;
        const replacement = options.transform(propContext);
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

    return (sourceFile) =>
      ts.visitEachChild(sourceFile, (node) => visit(node, options.withinFunction === undefined), context);
  };
}

function functionScope(
  node: ts.Node,
  active: boolean,
  withinFunction: MatchPredicate | undefined,
  factory: ts.NodeFactory
): boolean {
  if (!withinFunction || !ts.isFunctionDeclaration(node)) return active;
  return withinFunction(node, { function: node, factory });
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
        if (!options.when(member, propertyContext)) return member;
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

function editInterfaceDeclaration(options: InterfaceDeclarationEditOptions): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.Node => {
      const next = ts.visitEachChild(node, visit, context);
      if (!ts.isInterfaceDeclaration(next)) return next;

      const interfaceContext: InterfaceDeclarationContext = { interface: next, factory };
      if (!options.when(next, interfaceContext)) return next;
      return options.transform(interfaceContext) ?? next;
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function editFunctionDeclaration(options: FunctionDeclarationEditOptions): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.Node => {
      const next = ts.visitEachChild(node, visit, context);
      if (!ts.isFunctionDeclaration(next)) return next;

      const functionContext: FunctionDeclarationContext = { function: next, factory };
      if (!options.when(next, functionContext)) return next;
      return options.transform(functionContext) ?? next;
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
        result = addNamedImport(
          result,
          { source: ref.source, name: ref.name, default: ref.default, type: ref.type },
          factory,
          context
        );
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

function editModuleStatements(position: 'prepend' | 'append', statements: StatementSpec): CompilerTransform {
  const nextStatements = normalizeStatements(statements);
  return (context) => {
    const factory = context.factory;

    return (sourceFile) => {
      if (nextStatements.length === 0) return sourceFile;

      if (position === 'append') {
        return factory.updateSourceFile(sourceFile, [...sourceFile.statements, ...nextStatements]);
      }

      return insertStatementsAfterImports(sourceFile, nextStatements, factory);
    };
  };
}

function insertStatementsBeforeFunction(
  when: MatchPredicate,
  statements: FunctionSiblingStatementSpec
): CompilerTransform {
  return (context) => {
    const factory = context.factory;
    return (sourceFile) => {
      const nextStatements: ts.Statement[] = [];
      for (const statement of sourceFile.statements) {
        if (ts.isFunctionDeclaration(statement)) {
          const functionContext: FunctionDeclarationContext = { function: statement, factory };
          if (when(statement, functionContext)) {
            const siblings = typeof statements === 'function' ? statements(functionContext) : statements;
            nextStatements.push(...normalizeStatements(siblings));
          }
        }
        nextStatements.push(statement);
      }
      return factory.updateSourceFile(sourceFile, nextStatements);
    };
  };
}

function removeVariableDeclarations(name: string | RegExp): CompilerTransform {
  return (context) => {
    const factory = context.factory;
    const visit = (node: ts.Node): ts.VisitResult<ts.Node | undefined> => {
      const next = ts.visitEachChild(node, visit, context);
      if (!ts.isVariableStatement(next)) return next;

      const declarations = next.declarationList.declarations.filter((declaration) => {
        if (!ts.isIdentifier(declaration.name)) return true;
        return typeof name === 'string' ? declaration.name.text !== name : !name.test(declaration.name.text);
      });
      if (declarations.length === next.declarationList.declarations.length) return next;
      if (declarations.length === 0) return undefined;
      return factory.updateVariableStatement(
        next,
        next.modifiers,
        factory.updateVariableDeclarationList(next.declarationList, declarations)
      );
    };
    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function editFunctionBody(
  declaration: ts.FunctionDeclaration,
  position: 'prepend' | 'append' | 'beforeReturn',
  statements: StatementSpec,
  factory: ts.NodeFactory
): ts.FunctionDeclaration | undefined {
  if (!declaration.body) return undefined;

  const nextStatements = normalizeStatements(statements);
  if (nextStatements.length === 0) return undefined;

  let bodyStatements: ts.Statement[];
  if (position === 'prepend') {
    bodyStatements = [...nextStatements, ...declaration.body.statements];
  } else if (position === 'append') {
    bodyStatements = [...declaration.body.statements, ...nextStatements];
  } else {
    const returnIndex = declaration.body.statements.findIndex(ts.isReturnStatement);
    const insertIndex = returnIndex >= 0 ? returnIndex : declaration.body.statements.length;
    bodyStatements = [
      ...declaration.body.statements.slice(0, insertIndex),
      ...nextStatements,
      ...declaration.body.statements.slice(insertIndex),
    ];
  }

  return factory.updateFunctionDeclaration(
    declaration,
    declaration.modifiers,
    declaration.asteriskToken,
    declaration.name,
    declaration.typeParameters,
    declaration.parameters,
    declaration.type,
    factory.updateBlock(declaration.body, bodyStatements)
  );
}

function normalizeStatements(statements: StatementSpec): ts.Statement[] {
  return isStatementArray(statements) ? [...statements] : [statements];
}

function isStatementArray(statements: StatementSpec): statements is readonly ts.Statement[] {
  return Array.isArray(statements);
}

function asConst(expression: ts.Expression): ts.AsExpression {
  return ts.factory.createAsExpression(expression, ts.factory.createTypeReferenceNode('const'));
}

function addJsxPropsSpread(
  element: JsxElementLike,
  value: ValueReference,
  factory: ts.NodeFactory,
  options: JsxSpreadPropsOptions = {}
): JsxElementLike | undefined {
  const attrs = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
  const expression = valueFromReference(value);

  if (typeof value === 'string' && hasJsxSpreadAttribute(attrs, value)) return undefined;

  const spread = factory.createJsxSpreadAttribute(expression);
  const properties = options.position === 'start' ? [spread, ...attrs.properties] : [...attrs.properties, spread];
  const nextAttrs = factory.createJsxAttributes(properties);

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

function makeJsxElementSelfClosing(element: JsxElementLike, factory: ts.NodeFactory): JsxElementLike | undefined {
  if (ts.isJsxSelfClosingElement(element)) return undefined;
  return factory.createJsxSelfClosingElement(
    element.openingElement.tagName,
    element.openingElement.typeArguments,
    element.openingElement.attributes
  );
}

function addInterfaceExtends(
  declaration: ts.InterfaceDeclaration,
  value: string | ImportReference,
  factory: ts.NodeFactory
): ts.InterfaceDeclaration | undefined {
  const name = typeof value === 'string' ? value : value.name;
  const heritageClauses = declaration.heritageClauses ? [...declaration.heritageClauses] : [];
  const extendsIndex = heritageClauses.findIndex((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword);
  const nextType = factory.createExpressionWithTypeArguments(valueFromReference(value), undefined);

  if (extendsIndex >= 0) {
    const extendsClause = heritageClauses[extendsIndex]!;
    if (extendsClause.types.some((type) => heritageTypeName(type) === name)) return undefined;
    heritageClauses[extendsIndex] = factory.updateHeritageClause(extendsClause, [...extendsClause.types, nextType]);
  } else {
    heritageClauses.push(factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [nextType]));
  }

  return factory.updateInterfaceDeclaration(
    declaration,
    declaration.modifiers,
    declaration.name,
    declaration.typeParameters,
    heritageClauses,
    declaration.members
  );
}

function replaceInterfaceExtends(
  declaration: ts.InterfaceDeclaration,
  from: string | RegExp,
  to: string | ImportReference,
  factory: ts.NodeFactory
): ts.InterfaceDeclaration | undefined {
  if (!declaration.heritageClauses) return undefined;

  let changed = false;
  const heritageClauses = declaration.heritageClauses.map((clause) => {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) return clause;
    const types = clause.types.map((type) => {
      const name = heritageTypeName(type);
      const matches = name !== undefined && (typeof from === 'string' ? name === from : from.test(name));
      if (!matches) return type;
      changed = true;
      return factory.updateExpressionWithTypeArguments(type, expressionFromReference(to), type.typeArguments);
    });
    return factory.updateHeritageClause(clause, types);
  });

  if (!changed) return undefined;
  return factory.updateInterfaceDeclaration(
    declaration,
    declaration.modifiers,
    declaration.name,
    declaration.typeParameters,
    heritageClauses,
    declaration.members
  );
}

function addFunctionProps(
  declaration: ts.FunctionDeclaration,
  parameterIndex: number,
  props: readonly FunctionPropSpec[],
  factory: ts.NodeFactory
): ts.FunctionDeclaration | undefined {
  const parameter = declaration.parameters[parameterIndex];
  if (!parameter) {
    if (parameterIndex !== declaration.parameters.length) return undefined;
    const elements = props.map((spec) => {
      const name = typeof spec === 'string' ? spec : spec.name;
      const spread = typeof spec === 'object' && spec.spread === true;
      return factory.createBindingElement(
        spread ? factory.createToken(ts.SyntaxKind.DotDotDotToken) : undefined,
        undefined,
        factory.createIdentifier(name),
        undefined
      );
    });
    const nextParameter = factory.createParameterDeclaration(
      undefined,
      undefined,
      factory.createObjectBindingPattern(elements)
    );
    return factory.updateFunctionDeclaration(
      declaration,
      declaration.modifiers,
      declaration.asteriskToken,
      declaration.name,
      declaration.typeParameters,
      [...declaration.parameters, nextParameter],
      declaration.type,
      declaration.body
    );
  }
  if (!ts.isObjectBindingPattern(parameter.name)) return undefined;

  const existing = new Set<string>();
  const normalElements: ts.BindingElement[] = [];
  let spreadElement: ts.BindingElement | undefined;

  for (const element of parameter.name.elements) {
    const name = bindingElementName(element);
    if (name) existing.add(name);
    if (element.dotDotDotToken) {
      spreadElement = element;
    } else {
      normalElements.push(element);
    }
  }

  let changed = false;
  const nextElements = [...normalElements];
  let nextSpreadElement = spreadElement;

  for (const spec of props) {
    const name = typeof spec === 'string' ? spec : spec.name;
    const spread = typeof spec === 'object' && spec.spread === true;

    if (spread) {
      if (nextSpreadElement) continue;
      nextSpreadElement = factory.createBindingElement(
        factory.createToken(ts.SyntaxKind.DotDotDotToken),
        undefined,
        factory.createIdentifier(name),
        undefined
      );
      changed = true;
      continue;
    }

    if (existing.has(name)) continue;
    nextElements.push(factory.createBindingElement(undefined, undefined, factory.createIdentifier(name), undefined));
    existing.add(name);
    changed = true;
  }

  if (!changed) return undefined;

  const nextBinding = factory.updateObjectBindingPattern(
    parameter.name,
    nextSpreadElement ? [...nextElements, nextSpreadElement] : nextElements
  );
  const nextParameter = factory.updateParameterDeclaration(
    parameter,
    parameter.modifiers,
    parameter.dotDotDotToken,
    nextBinding,
    parameter.questionToken,
    parameter.type,
    parameter.initializer
  );
  const nextParameters = declaration.parameters.map((item, index) => (index === parameterIndex ? nextParameter : item));

  return factory.updateFunctionDeclaration(
    declaration,
    declaration.modifiers,
    declaration.asteriskToken,
    declaration.name,
    declaration.typeParameters,
    nextParameters,
    declaration.type,
    declaration.body
  );
}

function setFunctionProps(
  declaration: ts.FunctionDeclaration,
  props: readonly FunctionPropSpec[],
  options: FunctionPropsOptions,
  factory: ts.NodeFactory
): ts.FunctionDeclaration | undefined {
  const parameterIndex = options.parameterIndex ?? 0;
  const parameter = declaration.parameters[parameterIndex];
  if (!parameter && parameterIndex !== declaration.parameters.length) return undefined;

  const binding = factory.createObjectBindingPattern(
    props.map((spec) =>
      factory.createBindingElement(
        typeof spec === 'object' && spec.spread === true
          ? factory.createToken(ts.SyntaxKind.DotDotDotToken)
          : undefined,
        undefined,
        factory.createIdentifier(typeof spec === 'string' ? spec : spec.name),
        undefined
      )
    )
  );
  const type = options.type === undefined ? parameter?.type : typeNodeFromReference(options.type, factory);
  const initializer = options.initializer === undefined ? parameter?.initializer : options.initializer;
  const nextParameter = parameter
    ? factory.updateParameterDeclaration(
        parameter,
        parameter.modifiers,
        parameter.dotDotDotToken,
        binding,
        parameter.questionToken,
        type,
        initializer
      )
    : factory.createParameterDeclaration(undefined, undefined, binding, undefined, type, initializer);
  const parameters = parameter
    ? declaration.parameters.map((item, index) => (index === parameterIndex ? nextParameter : item))
    : [...declaration.parameters, nextParameter];

  return factory.updateFunctionDeclaration(
    declaration,
    declaration.modifiers,
    declaration.asteriskToken,
    declaration.name,
    declaration.typeParameters,
    parameters,
    declaration.type,
    declaration.body
  );
}

function typeNodeFromReference(value: string | ImportReference | ts.TypeNode, factory: ts.NodeFactory): ts.TypeNode {
  if (typeof value === 'string') return factory.createTypeReferenceNode(value);
  if (isImportReference(value)) {
    value.used = true;
    return factory.createTypeReferenceNode(value.name);
  }
  if (isNode(value) && ts.isTypeNode(value)) return value;
  throw new TypeError('Expected a type node or import reference.');
}

function createJsxProp(name: string, value: JsxPropValue, factory: ts.NodeFactory): ts.JsxAttribute {
  const initializer =
    value === undefined
      ? undefined
      : typeof value === 'string'
        ? factory.createStringLiteral(value)
        : factory.createJsxExpression(undefined, valueFromReference(value));
  return factory.createJsxAttribute(factory.createIdentifier(name), initializer);
}

function createJsxProps(spec: JsxPropsSpec, factory: ts.NodeFactory): (ts.JsxAttribute | ts.JsxSpreadAttribute)[] {
  if (Array.isArray(spec)) return [...spec];
  return Object.entries(spec).map(([name, value]) => createJsxProp(name, value, factory));
}

function heritageTypeName(type: ts.ExpressionWithTypeArguments): string | undefined {
  return readAccessPath(type.expression)?.join('.');
}

function bindingElementName(element: ts.BindingElement): string | undefined {
  if (ts.isIdentifier(element.name)) return element.name.text;
  return undefined;
}

function readJsxElement(value: unknown, context: unknown): JsxElementLike | undefined {
  if (isNode(value) && isJsxNodeLike(value)) return value;
  if (isObject(context) && isNode(context.element) && isJsxNodeLike(context.element)) return context.element;
  return undefined;
}

function readJsxProp(value: unknown, context: unknown): ts.JsxAttribute | undefined {
  if (isJsxProp(value)) return value;
  if (isObject(context) && isJsxProp(context.prop)) return context.prop;
  return undefined;
}

function readJsxPropValue(value: unknown, context: unknown): ts.Expression | undefined {
  if (isObject(context) && isNode(context.value) && ts.isExpression(context.value)) return context.value;
  const prop = readJsxProp(value, context);
  return prop ? readJsxAttributeExpression(prop) : undefined;
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

function readFunctionDeclaration(value: unknown, context: unknown): ts.FunctionDeclaration | undefined {
  if (isNode(value) && ts.isFunctionDeclaration(value)) return value;
  if (isObject(context) && isNode(context.function) && ts.isFunctionDeclaration(context.function)) {
    return context.function as ts.FunctionDeclaration;
  }
  return undefined;
}

function isJsxProp(value: unknown): value is ts.JsxAttribute {
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
