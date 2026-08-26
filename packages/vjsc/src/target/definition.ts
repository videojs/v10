import type { Program } from '@oxc-project/types';
import type { RolldownMagicString } from 'rolldown';

import type { ModuleImport } from '../ast/imports';
import type {
  ComponentDefinition,
  ComponentRecord,
  ComponentSchema,
  EmptyProps,
  InferProps,
} from '../components/definition';
import type { BoxProps, SlotProps, TemplatePartProps, TemplateProps, TextProps } from '../components/jsx-runtime';
import { createTargetCode } from './expression';

export const TARGET_ELEMENT = Symbol.for('vjsc/target-element');
export const TARGET_FRAGMENT = Symbol.for('vjsc/target-fragment');
export const TARGET_HOST = Symbol.for('vjsc/target-host');
export const TARGET_NODE = Symbol.for('vjsc/target-node');
export const TARGET_EXPRESSION = Symbol.for('vjsc/target-expression');
export const TARGET_SPREAD = Symbol.for('vjsc/target-spread');
export const TARGET_WITH_PROPS = Symbol.for('vjsc/target-with-props');

export type TargetImport = ModuleImport;

export interface TargetSideEffectImport {
  readonly from: string;
  readonly sideEffect: true;
}

export interface TargetPropsReference extends TargetImport {
  readonly intrinsic?: string | undefined;
  readonly children?: string | undefined;
}

export type TargetReference =
  | {
      readonly kind: 'component';
      readonly component: string;
      readonly part: string | null;
    }
  | {
      readonly kind: 'import';
      readonly import: TargetImport;
      readonly props?: TargetPropsReference | undefined;
    }
  | {
      readonly kind: 'element';
      readonly tagName: string;
      readonly import?: TargetSideEffectImport | undefined;
      readonly props?: TargetPropsReference | undefined;
    };

export interface TargetNode {
  readonly [TARGET_NODE]: true;
  readonly type: TargetElementType;
  readonly props: Record<string, unknown>;
  readonly key: string | number | null;
}

export type TargetExpressionNode =
  | { readonly kind: 'reference'; readonly code: string }
  | { readonly kind: 'function'; readonly parameters: readonly string[]; readonly output: TargetOutput }
  | { readonly kind: 'conditional'; readonly test: TargetExpressionNode; readonly output: TargetOutput };

export interface TargetExpression {
  readonly [TARGET_EXPRESSION]: TargetExpressionNode;
}

export type TargetBinding<Value = unknown> = TargetExpression &
  (Value extends object ? { readonly [Name in keyof Value]-?: TargetBinding<Value[Name]> } : object);

export interface TargetWithProps {
  readonly [TARGET_WITH_PROPS]: true;
  readonly children: TargetOutput;
  readonly props: TargetExpressionNode | Readonly<Record<string, unknown>>;
}

export type TargetOutput =
  | TargetNode
  | TargetExpression
  | TargetWithProps
  | string
  | number
  | false
  | null
  | undefined
  | readonly TargetOutput[];

export interface TargetReferenceValue {
  readonly [TARGET_ELEMENT]: TargetReference;
}

export interface TargetElement<Props extends object = Record<string, unknown>> extends TargetReferenceValue {
  (props: Props & { readonly children?: unknown }): TargetNode;
}

export type TargetElementType = TargetElement | typeof TARGET_FRAGMENT | typeof TARGET_HOST;

export interface TargetCode {
  param<Value = unknown>(name: string): TargetBinding<Value>;
  fn(parameters: readonly TargetBinding[], output: TargetOutput): TargetExpression;
  when(test: TargetExpression, output: TargetOutput): TargetExpression;
  withProps(children: TargetOutput, props: TargetExpression | Readonly<Record<string, unknown>>): TargetWithProps;
}

export interface ComponentTargetPath<Schema extends ComponentSchema = ComponentSchema> {
  readonly component: keyof Schema['definitions'] & string;
  readonly part: string | null;
}

export interface SourcePropOperations<Props extends object> {
  has<Name extends keyof Props & string>(name: Name): boolean;
  get<Name extends keyof Props & string>(name: Name): Props[Name];
  omit<Names extends keyof Props & string>(...names: readonly Names[]): SourceProps<Omit<Props, Names>>;
  merge<Other extends object>(other: SourceProps<Other>): SourceProps<Props & Other>;
}

export type SourceProps<Props extends object> = Props & SourcePropOperations<Props>;

export interface SourcePart<Props extends object = EmptyProps> {
  readonly props: SourceProps<Props>;
  readonly children: TargetOutput;
}

export interface SourcePartCollection<Props extends object = EmptyProps> extends SourcePart<Props> {
  one(): SourcePart<Props>;
  all(): readonly SourcePart<Props>[];
}

type DefinedParts<Definition> =
  Definition extends ComponentDefinition<object, infer Parts> ? Exclude<Parts, undefined> : never;

type DefinedRoot<Definition, Parts extends ComponentRecord> = Definition extends {
  readonly root: infer Root;
}
  ? Extract<Root, keyof Parts>
  : never;

type RootProps<Definition> = [DefinedParts<Definition>] extends [never]
  ? InferProps<Definition>
  : DefinedParts<Definition> extends infer Parts extends ComponentRecord
    ? [DefinedRoot<Definition, Parts>] extends [never]
      ? InferProps<Definition>
      : InferProps<Parts[DefinedRoot<Definition, Parts>]>
    : InferProps<Definition>;

type SourceParts<Definition> = [DefinedParts<Definition>] extends [never]
  ? Record<never, never>
  : DefinedParts<Definition> extends infer Parts extends ComponentRecord
    ? {
        readonly [Part in Exclude<keyof Parts, DefinedRoot<Definition, Parts>>]: SourcePartFor<Parts[Part]>;
      }
    : Record<never, never>;

export type SourcePartFor<Definition> = SourcePartCollection<RootProps<Definition>> & SourceParts<Definition>;

export interface ComponentRewriteContext<Definition> {
  readonly props: SourceProps<RootProps<Definition>>;
  readonly children: TargetOutput;
  readonly parts: SourceParts<Definition>;
  id(name: string): string;
}

export type ComponentRewrite<Definition> = (context: ComponentRewriteContext<Definition>) => TargetOutput;

export interface PrimitiveRewriteContext<Props extends object> {
  readonly props: SourceProps<Props>;
  readonly children: TargetOutput;
  id(name: string): string;
}

export type PrimitiveTargetRule<Props extends object> =
  | TargetReferenceValue
  | ((context: PrimitiveRewriteContext<Props>) => TargetOutput);

export interface TemplateTargetDefinition {
  readonly render: PrimitiveTargetRule<Omit<TemplateProps, 'name'>>;
  readonly parts?: Readonly<Record<string, PrimitiveTargetRule<Omit<TemplatePartProps, 'name'>>>> | undefined;
}

export type TemplateTargetRule = PrimitiveTargetRule<Omit<TemplateProps, 'name'>> | TemplateTargetDefinition;

export interface ComponentTargetPrimitives {
  readonly Box?: PrimitiveTargetRule<BoxProps> | undefined;
  readonly Slot?: PrimitiveTargetRule<SlotProps> | undefined;
  readonly Text?: PrimitiveTargetRule<TextProps> | undefined;
  readonly Template?: Readonly<Record<string, TemplateTargetRule>> | undefined;
}

type TargetTree<Definition> = TargetElement &
  ([DefinedParts<Definition>] extends [never]
    ? object
    : DefinedParts<Definition> extends infer Parts extends ComponentRecord
      ? {
          readonly [Part in keyof Parts]: TargetTree<Parts[Part]>;
        }
      : object);

export type ComponentTargetNamespace<Schema extends ComponentSchema> = {
  readonly [Name in keyof Schema['definitions']]: TargetTree<Schema['definitions'][Name]>;
};

export type ComponentTargetRule<Definition> =
  | TargetReferenceValue
  | ComponentRewrite<Definition>
  | ([DefinedParts<Definition>] extends [never]
      ? never
      : DefinedParts<Definition> extends infer Parts extends ComponentRecord
        ? {
            readonly [Part in keyof Parts]?: ComponentTargetRule<Parts[Part]> | undefined;
          }
        : never);

export type ComponentTargetRules<Definitions extends ComponentRecord> = {
  readonly [Name in keyof Definitions]?: ComponentTargetRule<Definitions[Name]> | undefined;
};

export type ComponentTargetResolver<Schema extends ComponentSchema> = (
  path: ComponentTargetPath<Schema>
) => TargetElement | ComponentRewrite<unknown> | undefined;

export interface ComponentTargetJsx {
  readonly importSource: string;
  readonly attributes: 'html' | 'react';
  /** Runtime fallback used when host props target a dynamic child expression. */
  readonly host?: TargetImport | undefined;
  /** Runtime boundary used to resolve component-scoped identifier placeholders. */
  readonly scope?: TargetImport | undefined;
}

export interface ComponentTargetTypes {
  readonly [sourceType: string]: TargetImport | undefined;
}

export interface ComponentTargetTransformContext {
  readonly code: string;
  readonly id: string;
  readonly ast: Program;
  readonly magicString: RolldownMagicString;
}

export interface ComponentTargetTransform {
  readonly name: string;
  transform(context: ComponentTargetTransformContext): boolean;
}

export interface ComponentTargetDefinition<Schema extends ComponentSchema> {
  readonly source: Schema['source'];
  readonly resolve: ComponentTargetResolver<Schema>;
  readonly components?: ComponentTargetRules<NoInfer<Schema['definitions']>> | undefined;
  readonly primitives?: ComponentTargetPrimitives | undefined;
  readonly types?: ComponentTargetTypes | undefined;
  readonly transforms?: readonly ComponentTargetTransform[] | undefined;
  readonly jsx: ComponentTargetJsx;
}

export interface ComponentTarget<Schema extends ComponentSchema = ComponentSchema> {
  readonly source: Schema['source'];
  readonly resolve: ComponentTargetResolver<Schema>;
  readonly components: ComponentTargetRules<Schema['definitions']>;
  readonly primitives: ComponentTargetPrimitives;
  readonly types: ComponentTargetTypes;
  readonly transforms: readonly ComponentTargetTransform[];
  readonly jsx: ComponentTargetJsx;
}

export interface ElementTargetOptions {
  readonly import?: TargetSideEffectImport | undefined;
  readonly props?: TargetPropsReference | undefined;
}

export interface ImportedTargetOptions extends TargetImport {
  readonly props?: TargetPropsReference | undefined;
}

export interface ComponentTargetHelpers<Schema extends ComponentSchema> {
  readonly target: ComponentTargetNamespace<Schema>;
  readonly code: TargetCode;
  element<Props extends object = Record<string, unknown>>(
    tagName: string,
    options?: ElementTargetOptions
  ): TargetElement<Props>;
  imported<Props extends object = Record<string, unknown>>(options: ImportedTargetOptions): TargetElement<Props>;
}

export function defineComponentTarget<const Schema extends ComponentSchema>(): (
  create: (helpers: ComponentTargetHelpers<Schema>) => ComponentTargetDefinition<Schema>
) => ComponentTarget<Schema> {
  return (create) => {
    const definition = create({
      target: createTargetNamespace<Schema>(),
      code: createTargetCode(),
      element: createElementTarget,
      imported: createImportedTarget,
    });

    return {
      source: definition.source,
      resolve: definition.resolve,
      components: definition.components ?? {},
      primitives: definition.primitives ?? {},
      types: definition.types ?? {},
      transforms: definition.transforms ?? [],
      jsx: definition.jsx,
    };
  };
}

export function createElementTarget<Props extends object = Record<string, unknown>>(
  tagName: string,
  options: ElementTargetOptions = {}
): TargetElement<Props> {
  return createTargetElement({ kind: 'element', tagName, ...options });
}

export function createImportedTarget<Props extends object = Record<string, unknown>>(
  options: ImportedTargetOptions
): TargetElement<Props> {
  const { props, ...targetImport } = options;

  return createTargetElement({
    kind: 'import',
    import: targetImport,
    ...(props ? { props } : {}),
  });
}

export function createTargetElement<Props extends object = Record<string, unknown>>(
  reference: TargetReference
): TargetElement<Props> {
  const element = (_props: Props & { readonly children?: unknown }): TargetNode => {
    throw new Error('vjsc/target: target elements can only be evaluated by the target JSX runtime.');
  };

  return Object.assign(element, { [TARGET_ELEMENT]: reference });
}

export function isTargetElement(value: unknown): value is TargetElement {
  return typeof value === 'function' && TARGET_ELEMENT in value;
}

function createTargetNamespace<Schema extends ComponentSchema>(): ComponentTargetNamespace<Schema> {
  return createComponentTargetReference([]) as ComponentTargetNamespace<Schema>;
}

function createComponentTargetReference(path: readonly string[]): TargetElement {
  const reference = createTargetElement({
    kind: 'component',
    component: path[0] ?? '',
    part: path.length > 1 ? path.slice(1).join('.') : null,
  });
  const children = new Map<PropertyKey, unknown>();

  return new Proxy(reference, {
    get(target, property) {
      if (property === 'then' && path.length === 0) return undefined;

      const ownTarget = target as TargetElement & Readonly<Record<PropertyKey, unknown>>;
      if (property in ownTarget) return ownTarget[property];

      if (!children.has(property)) {
        children.set(property, createComponentTargetReference([...path, String(property)]));
      }

      return children.get(property);
    },
  });
}
