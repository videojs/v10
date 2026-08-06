import ts from 'typescript';
import type { CompilerContext, CompilerPipelineStep, CompilerPlugin, CompilerTransform } from './config';
import type { JsxElementLike } from './jsx';
import { tagName } from './jsx';
import { addNamedImport } from './transforms/add-import';
import { type ImportRewriteOptions, type ImportRule, transformImports } from './transforms/imports';

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
    call(callee: ValueReference, args: readonly ValueReference[]): ts.CallExpression;
    conditional(test: ts.Expression, whenTrue: ts.Expression, whenFalse: ts.Expression): ts.ConditionalExpression;
    identifier(value: string | ImportReference): ts.Identifier;
    number(value: number): ts.NumericLiteral;
    onlyIf(options: ValueOnlyIfOptions): ts.ConditionalExpression;
    string(value: string): ts.StringLiteral;
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
    named(value: string | ImportReference): ts.TypeReferenceNode;
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
    prop(options: JsxPropEditOptions): CompilerTransform;
    addProp(name: string, value?: JsxPropValue): JsxElementEdit;
    addPropsSpread(value: ValueReference): JsxElementEdit;
    moveChildToProp(prop: string): JsxElementEdit;
    replaceTag(tag: string | ImportReference): JsxElementEdit;
  };
  interface: {
    declaration(options: InterfaceDeclarationEditOptions): CompilerTransform;
    extends(value: string | ImportReference): InterfaceDeclarationEdit;
    property(options: InterfacePropertyEditOptions): CompilerTransform;
    setType(type: (context: InterfacePropertyContext) => ts.TypeNode): InterfacePropertyEdit;
  };
  function: {
    declaration(options: FunctionDeclarationEditOptions): CompilerTransform;
    addProps(props: readonly FunctionPropSpec[], parameterIndex?: number): FunctionDeclarationEdit;
  };
}

export interface ValueHelpers {
  and(left: ValueReference, right: ts.Expression): ts.BinaryExpression;
  array(items: readonly ValueReference[], options?: ValueArrayOptions): ts.ArrayLiteralExpression | ts.AsExpression;
  arrayItems(value: ts.Expression): ts.Expression[];
  call(callee: ValueReference, args: readonly ValueReference[]): ts.CallExpression;
  conditional(test: ts.Expression, whenTrue: ts.Expression, whenFalse: ts.Expression): ts.ConditionalExpression;
  identifier(value: string | ImportReference): ts.Identifier;
  isArray(): MatchPredicate;
  number(value: number): ts.NumericLiteral;
  string(value: string): ts.StringLiteral;
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
  if(test: ValueReference, element: ts.Expression): ts.JsxExpression;
  props(name: string): JsxPropsSelection;
}

export interface ValueArrayOptions {
  asConst?: boolean | undefined;
}

export interface JsxElementSelection {
  addProp(name: string, value?: JsxPropValue): CompilerTransform;
  childToProp(prop: string): CompilerTransform;
  replace(replacement: string | ImportReference | JsxElementReplacement): CompilerTransform;
  spreadProps(value: ValueReference): CompilerTransform;
}

export type JsxElementReplacement = (context: JsxElementContext) => ts.Node | undefined;

export interface JsxPropsSelection {
  replace(transform: (context: JsxPropContext) => ts.Expression | undefined): CompilerTransform;
  where(predicate: MatchPredicate): JsxPropsSelection;
}

export interface TypeHelpers {
  named(value: string | ImportReference): ts.TypeReferenceNode;
  union(...types: readonly ts.TypeNode[]): ts.UnionTypeNode;
  undefined(): ts.KeywordTypeNode;
}

export interface InterfaceSelection {
  extends(value: string | ImportReference): CompilerTransform;
  property(name: string): InterfacePropertySelection;
}

export interface InterfacePropertySelection {
  setType(type: (context: InterfacePropertyContext) => ts.TypeNode): CompilerTransform;
}

export interface FunctionSelection {
  addProps(props: readonly FunctionPropSpec[], parameterIndex?: number): CompilerTransform;
  append(statements: StatementSpec): CompilerTransform;
  beforeReturn(statements: StatementSpec): CompilerTransform;
  prepend(statements: StatementSpec): CompilerTransform;
}

export interface ModuleSelection {
  append(statements: StatementSpec): CompilerTransform;
  prepend(statements: StatementSpec): CompilerTransform;
}

export interface StatementHelpers {
  const(name: string, initializer: ValueReference, options?: ConstStatementOptions): ts.VariableStatement;
}

export interface ConstStatementOptions {
  asConst?: boolean | undefined;
  export?: boolean | undefined;
  type?: ts.TypeNode | undefined;
}

export type StatementSpec = ts.Statement | readonly ts.Statement[];

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
}

export type TransformStep = CompilerTransform | CompilerPlugin | null | undefined | false;
export type TransformCallback = (helpers: TransformHelpers) => readonly TransformStep[];

export interface TransformOptions {
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
  };
}

function createValueHelpers(match: MatchHelpers, create: CreateHelpers): ValueHelpers {
  return {
    and: create.value.and,
    array: create.value.array,
    arrayItems: create.value.arrayItems,
    call: create.value.call,
    conditional: create.value.conditional,
    identifier: create.value.identifier,
    isArray: match.value.array,
    number: create.value.number,
    string: create.value.string,
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
    if: create.jsx.renderIf,
    props: (name) => createJsxPropsSelection(name, match, edit),
  };
}

function createJsxElementSelection(tag: string | RegExp, match: MatchHelpers, edit: EditHelpers): JsxElementSelection {
  const when = match.jsx.tag(tag);
  return {
    addProp: (name, value) => edit.jsx.element({ when, transform: edit.jsx.addProp(name, value) }),
    childToProp: (prop) => edit.jsx.element({ when, transform: edit.jsx.moveChildToProp(prop) }),
    replace(replacement) {
      const transform: JsxElementEdit =
        typeof replacement === 'function'
          ? (_element, context) => replacement(context)
          : edit.jsx.replaceTag(replacement);
      return edit.jsx.element({ when, transform });
    },
    spreadProps: (value) => edit.jsx.element({ when, transform: edit.jsx.addPropsSpread(value) }),
  };
}

function createJsxPropsSelection(
  name: string,
  match: MatchHelpers,
  edit: EditHelpers,
  predicates: readonly MatchPredicate[] = []
): JsxPropsSelection {
  const when = match.all(match.jsx.prop(name), ...predicates);
  return {
    replace: (transform) => edit.jsx.prop({ when, transform }),
    where: (predicate) => createJsxPropsSelection(name, match, edit, [...predicates, predicate]),
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
  };
}

function createFunctionSelection(name: string | RegExp, match: MatchHelpers, edit: EditHelpers): FunctionSelection {
  const when = match.function.name(name);
  return {
    addProps: (props, parameterIndex) =>
      edit.function.declaration({ when, transform: edit.function.addProps(props, parameterIndex) }),
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
      identifier(value) {
        if (isImportReference(value)) value.used = true;
        return ts.factory.createIdentifier(typeof value === 'string' ? value : value.name);
      },
      number(value) {
        return ts.factory.createNumericLiteral(value);
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
      named(value) {
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
      prop: editJsxProp,
      addProp:
        (name, value) =>
        (element, { factory }) =>
          addJsxProp(element, name, value, factory),
      addPropsSpread:
        (value) =>
        (element, { factory }) =>
          addJsxPropsSpread(element, value, factory),
      moveChildToProp:
        (prop) =>
        (element, { factory }) =>
          liftSingleChildToProp(element, prop, factory),
      replaceTag:
        (tag) =>
        (element, { factory }) =>
          replaceJsxTag(element, tag, factory),
    },
    interface: {
      declaration: editInterfaceDeclaration,
      extends: (value) => (interfaceContext) =>
        addInterfaceExtends(interfaceContext.interface, value, interfaceContext.factory),
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

function editJsxElement(options: JsxElementEditOptions): CompilerTransform {
  return (context) => {
    const visit = (node: ts.Node): ts.Node => {
      const next = ts.visitEachChild(node, visit, context);
      if (!isJsxElementLike(next)) return next;
      const elementContext: JsxElementContext = { element: next, factory: context.factory, tagName: tagName(next) };
      if (!options.when(next, elementContext)) return next;
      return options.transform(next, elementContext) ?? next;
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function editJsxProp(options: JsxPropEditOptions): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.Node => {
      const next = ts.visitEachChild(node, visit, context);
      if (!isJsxElementLike(next)) return next;

      const attrs = ts.isJsxElement(next) ? next.openingElement.attributes : next.attributes;
      let changed = false;
      const properties = attrs.properties.map((property) => {
        if (!ts.isJsxAttribute(property)) return property;
        const value = readPropValue(property);
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

      let insertIndex = 0;
      for (let i = 0; i < sourceFile.statements.length; i++) {
        if (ts.isImportDeclaration(sourceFile.statements[i]!)) insertIndex = i + 1;
      }

      return factory.updateSourceFile(sourceFile, [
        ...sourceFile.statements.slice(0, insertIndex),
        ...nextStatements,
        ...sourceFile.statements.slice(insertIndex),
      ]);
    };
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

function liftSingleChildToProp(
  element: JsxElementLike,
  prop: string,
  factory: ts.NodeFactory
): JsxElementLike | undefined {
  if (!ts.isJsxElement(element)) return undefined;
  const opening = element.openingElement;
  if (hasProp(opening.attributes, prop)) return undefined;

  const child = singleElementChild(element.children);
  if (!child) return undefined;

  const nextAttrs = factory.createJsxAttributes([
    ...opening.attributes.properties,
    factory.createJsxAttribute(factory.createIdentifier(prop), factory.createJsxExpression(undefined, child)),
  ]);

  return factory.createJsxSelfClosingElement(opening.tagName, opening.typeArguments, nextAttrs);
}

function addJsxProp(
  element: JsxElementLike,
  name: string,
  value: JsxPropValue,
  factory: ts.NodeFactory
): JsxElementLike | undefined {
  const attrs = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
  if (hasProp(attrs, name)) return undefined;

  const nextAttrs = factory.createJsxAttributes([...attrs.properties, createJsxProp(name, value, factory)]);

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

function addJsxPropsSpread(
  element: JsxElementLike,
  value: ValueReference,
  factory: ts.NodeFactory
): JsxElementLike | undefined {
  const attrs = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
  const expression = valueFromReference(value);

  if (typeof value === 'string' && hasPropsSpread(attrs, value)) return undefined;

  const nextAttrs = factory.createJsxAttributes([...attrs.properties, factory.createJsxSpreadAttribute(expression)]);

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

function addFunctionProps(
  declaration: ts.FunctionDeclaration,
  parameterIndex: number,
  props: readonly FunctionPropSpec[],
  factory: ts.NodeFactory
): ts.FunctionDeclaration | undefined {
  const parameter = declaration.parameters[parameterIndex];
  if (!parameter || !ts.isObjectBindingPattern(parameter.name)) return undefined;

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

function replaceJsxTag(
  element: JsxElementLike,
  tag: string | ImportReference,
  factory: ts.NodeFactory
): JsxElementLike {
  if (ts.isJsxElement(element)) {
    return factory.updateJsxElement(
      element,
      factory.updateJsxOpeningElement(
        element.openingElement,
        jsxTagNameFromReference(tag),
        element.openingElement.typeArguments,
        element.openingElement.attributes
      ),
      element.children,
      factory.updateJsxClosingElement(element.closingElement, jsxTagNameFromReference(tag))
    );
  }

  return factory.updateJsxSelfClosingElement(
    element,
    jsxTagNameFromReference(tag),
    element.typeArguments,
    element.attributes
  );
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

function hasProp(attrs: ts.JsxAttributes, name: string): boolean {
  return attrs.properties.some(
    (property) => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name
  );
}

function hasPropsSpread(attrs: ts.JsxAttributes, name: string): boolean {
  return attrs.properties.some(
    (property) =>
      ts.isJsxSpreadAttribute(property) && ts.isIdentifier(property.expression) && property.expression.text === name
  );
}

function heritageTypeName(type: ts.ExpressionWithTypeArguments): string | undefined {
  const expression = type.expression;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return undefined;
}

function bindingElementName(element: ts.BindingElement): string | undefined {
  if (ts.isIdentifier(element.name)) return element.name.text;
  return undefined;
}

function readPropValue(prop: ts.JsxAttribute): ts.Expression | undefined {
  const init = prop.initializer;
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

function readJsxProp(value: unknown, context: unknown): ts.JsxAttribute | undefined {
  if (isJsxProp(value)) return value;
  if (isObject(context) && isJsxProp(context.prop)) return context.prop;
  return undefined;
}

function readJsxPropValue(value: unknown, context: unknown): ts.Expression | undefined {
  if (isObject(context) && isNode(context.value) && ts.isExpression(context.value)) return context.value;
  const prop = readJsxProp(value, context);
  return prop ? readPropValue(prop) : undefined;
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

function isJsxElementLike(value: unknown): value is JsxElementLike {
  return Boolean(isNode(value) && (ts.isJsxElement(value) || ts.isJsxSelfClosingElement(value)));
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
