import type ts from 'typescript';
import type {
  ComponentDefinition,
  ComponentRecord,
  ComponentSchema,
  EmptyProps,
  InferProps,
} from '../components/definition';
import type { Fragment, GroupProps, SlotProps, TemplateProps, TextProps } from '../components/jsx-runtime';
import { createRegistryElement, REGISTRY_ENTRY } from './element';

export { isRegistryElement } from './element';

export const REGISTRY_NODE = Symbol.for('vjsc/registry-node');
export const REGISTRY_HOST = Symbol.for('vjsc/registry-host');

export interface RegistryImport {
  readonly from: string;
  readonly name: string;
  readonly path?: readonly string[] | undefined;
}

export interface RegistrySideEffectImport {
  readonly from: string;
  readonly sideEffect: true;
}

export interface RegistryPropsReference extends RegistryImport {
  /** Intrinsic element passed as the imported type's single literal type argument. */
  readonly intrinsic?: string | undefined;
  /** Entry prop represented by authored children. Defaults to `children`. */
  readonly children?: string | undefined;
}

interface RegistryPropsMetadata {
  /** Public props exposed by this registry entry. */
  readonly props?: RegistryPropsReference | undefined;
}

export type RegistryEntryReference = RegistryPropsMetadata &
  (
    | {
        readonly import: RegistryImport;
        readonly tagName?: never;
      }
    | {
        readonly tagName: string;
        readonly import?: RegistrySideEffectImport | undefined;
      }
  );

export interface RegistryRenderEntry<Props extends object = EmptyProps> extends RegistryPropsMetadata {
  readonly render: RegistryRender<Props>;
  readonly when?: RegistryCondition<Props> | undefined;
  readonly transform?: never;
}

/** Controls how a registry-local AST transform materializes its authored children. */
export interface RegistryTransformRenderOptions {
  readonly parameters?: readonly string[] | undefined;
  readonly spreadProps?: string | undefined;
}

/** Compiler context for uncommon entries that cannot be expressed as registry JSX alone. */
export interface RegistryTransformContext<Props extends object = EmptyProps> extends RegistryRenderContext<Props> {
  readonly factory: ts.NodeFactory;
  render(options?: RegistryTransformRenderOptions): ts.Expression;
}

export interface RegistryTransformEntry<Props extends object = EmptyProps> extends RegistryPropsMetadata {
  readonly transform: (context: RegistryTransformContext<Props>) => ts.Expression;
  readonly render?: never;
  readonly when?: never;
}

export type RegistryEntry<Props extends object = EmptyProps> =
  | RegistryEntryReference
  | RegistryRenderEntry<Props>
  | RegistryTransformEntry<Props>;

export interface RegistryNode {
  readonly [REGISTRY_NODE]: true;
  readonly type: RegistryElementType;
  readonly props: Record<string, unknown>;
  readonly key: string | number | null;
}

export interface RegistryHost {
  readonly [REGISTRY_HOST]: true;
}

export interface RegistryElement<Props extends object = Record<string, unknown>> {
  /** Entry metadata carried by a registry JSX reference. */
  readonly [REGISTRY_ENTRY]: RegistryEntry<Props>;
  (props: Props & { children?: unknown }): RegistryNode;
}

export interface HostComponent extends RegistryHost {
  (props: Record<string, unknown>): RegistryNode;
}

export const Host = Object.assign(
  (_props: Record<string, unknown>): RegistryNode => {
    throw new Error('vjsc/registry: <Host> can only be evaluated by the registry JSX runtime.');
  },
  { [REGISTRY_HOST]: true as const }
);

export type RegistryElementType = RegistryElement | HostComponent | typeof Fragment;

export interface RegistryReferenceContext {
  /** Create a JSX element for an additional entry used inside this render. */
  reference<Props extends object = Record<string, unknown>>(entry: RegistryEntry<Props>): RegistryElement<Props>;
}

export interface RegistryRenderContext<Props extends object = EmptyProps> extends RegistryReferenceContext {
  readonly props: Props & { readonly children?: unknown };
  /** Return a deterministic identifier scoped to this canonical component occurrence. */
  id(name: string): string;
}

export interface RegistryPart<Props extends object = EmptyProps> extends RegistryRenderContext<Props> {}

export interface RegistryPartCollection<Props extends object = EmptyProps> {
  one(): RegistryPart<Props>;
  all(): readonly RegistryPart<Props>[];
}

type PartCollections<Parts extends ComponentRecord, Root extends keyof Parts> = {
  readonly [Part in Exclude<keyof Parts, Root>]: RegistryPartCollection<InferProps<Parts[Part]>>;
};

export interface RegistryComponentContext<
  Parts extends ComponentRecord,
  Root extends keyof Parts & string = keyof Parts & string,
> extends RegistryReferenceContext {
  readonly root: RegistryPart<InferProps<Parts[Root]>>;
  readonly parts: PartCollections<Parts, Root>;
  /** Return a deterministic identifier shared by every part in this component occurrence. */
  id(name: string): string;
}

export type RegistryRender<Props extends object = EmptyProps> = (context: RegistryRenderContext<Props>) => unknown;

export type RegistryCondition<Props extends object = EmptyProps> = (context: RegistryRenderContext<Props>) => unknown;

export interface RegistryHostedEntry<Props extends object = EmptyProps> {
  /** Entry substituted for `<Host>` inside this render function. */
  readonly host: RegistryEntry<any>;
  readonly render: RegistryRender<Props>;
}

export type RegistryPartEntry<Props extends object = EmptyProps> =
  | RegistryEntry<Props>
  | typeof Fragment
  | RegistryRender<Props>
  | RegistryHostedEntry<Props>;

type PartEntries<Parts extends ComponentRecord> = {
  readonly [Part in keyof Parts]: RegistryPartEntry<InferProps<Parts[Part]>>;
};

type PartialPartEntries<Parts extends ComponentRecord> = {
  readonly [Part in keyof Parts]?: RegistryPartEntry<InferProps<Parts[Part]>>;
};

type RegistryComponentRender<Parts extends ComponentRecord, Root extends keyof Parts & string> = (
  context: RegistryComponentContext<Parts, Root>
) => RegistryNode;

export interface RegistryTemplate {
  /** Render the authored template through registry JSX. */
  readonly render: RegistryRender<Omit<TemplateProps, 'name'>>;
  /** Template-local entries keyed by `<Template.Part name>`. */
  readonly parts?: Readonly<Record<string, RegistryPartEntry<any>>> | undefined;
}

export interface RegistryPrimitives {
  readonly Group?: RegistryPartEntry<GroupProps> | undefined;
  readonly Slot?: RegistryPartEntry<SlotProps> | undefined;
  readonly Text?: RegistryPartEntry<TextProps> | undefined;
  readonly Template?: Readonly<Record<string, RegistryTemplate>> | undefined;
}

export type RegistryTypeResolver = (name: string) => RegistryImport | false | undefined;

export interface RegistryPropTransformContext {
  readonly name: string;
  readonly value: ts.Expression;
  readonly entry: RegistryEntryReference | undefined;
  readonly factory: ts.NodeFactory;
  import(reference: RegistryImport): ts.Identifier;
}

export type RegistryPropTransform = (context: RegistryPropTransformContext) => ts.Expression | undefined;

export interface RegistryOptions {
  readonly props?:
    | {
        readonly transform?: RegistryPropTransform | undefined;
      }
    | undefined;
  readonly primitives?: RegistryPrimitives | undefined;
  readonly types?: RegistryTypeResolver | undefined;
}

type DefinedParts<Definition> = Definition extends { readonly parts?: infer Parts } ? Exclude<Parts, undefined> : never;

type WholeComponentTransform<
  Definition extends ComponentDefinition<object, ComponentRecord | undefined>,
  Parts extends ComponentRecord,
> = Definition['root'] extends keyof Parts & string
  ? {
      readonly render: RegistryComponentRender<Parts, Definition['root']>;
      readonly parts?: PartialPartEntries<Parts> | undefined;
      readonly imports?: readonly string[] | undefined;
    }
  : never;

type CompoundEntryFor<
  Definition extends ComponentDefinition<object, ComponentRecord | undefined>,
  Parts extends ComponentRecord,
> =
  | RegistryEntryTree<Definition>
  | {
      readonly parts: PartEntries<Parts>;
      readonly render?: never;
      readonly imports?: readonly string[] | undefined;
    }
  | WholeComponentTransform<Definition, Parts>;

type LeafEntryFor<Definition extends ComponentDefinition<object, ComponentRecord | undefined>> = RegistryPartEntry<
  InferProps<Definition>
>;

type EntryFor<Definition extends ComponentDefinition<object, ComponentRecord | undefined>> = [
  DefinedParts<Definition>,
] extends [never]
  ? LeafEntryFor<Definition>
  : CompoundEntryFor<Definition, Extract<DefinedParts<Definition>, ComponentRecord>>;

export type RegistryEntries<Definitions extends ComponentRecord> = {
  readonly [Name in keyof Definitions]: EntryFor<Definitions[Name]>;
};

export interface ComponentRegistryBinding {
  readonly schema: ComponentSchema;
  readonly entries: Readonly<Record<string, unknown>>;
}

export interface ComponentRegistry {
  readonly bindings: readonly ComponentRegistryBinding[];
  readonly props?: RegistryOptions['props'];
  readonly primitives: RegistryPrimitives;
  readonly types?: RegistryTypeResolver | undefined;
}

export interface RegistryDefinition<Definitions extends ComponentRecord = ComponentRecord> extends RegistryOptions {
  readonly schema: ComponentSchema<Definitions>;
  readonly entries: RegistryEntries<NoInfer<Definitions>>;
}

type RegistryEntryTree<Definition extends ComponentDefinition<object, ComponentRecord | undefined>> = [
  DefinedParts<Definition>,
] extends [never]
  ? RegistryPartEntry<InferProps<Definition>>
  : {
      readonly [Part in keyof DefinedParts<Definition>]: RegistryEntryTree<DefinedParts<Definition>[Part]>;
    };

export function defineElement<Props extends object = Record<string, unknown>>(
  tagName: string,
  options: {
    readonly import?: RegistrySideEffectImport | undefined;
    readonly props?: RegistryPropsReference | undefined;
  } = {}
): RegistryElement<Props> & RegistryEntryReference {
  return createRegistryElement<Props, RegistryEntryReference>({ tagName, ...options });
}

export function defineRegistry<const Definitions extends ComponentRecord>(
  definition: RegistryDefinition<Definitions>
): ComponentRegistry {
  return {
    bindings: [{ schema: definition.schema, entries: definition.entries }],
    ...(definition.props ? { props: definition.props } : {}),
    primitives: definition.primitives ?? {},
    ...(definition.types ? { types: definition.types } : {}),
  };
}

export function extendRegistry(registry: ComponentRegistry, extension: ComponentRegistry): ComponentRegistry;
export function extendRegistry<const Definitions extends ComponentRecord>(
  registry: ComponentRegistry,
  extension: RegistryDefinition<Definitions>
): ComponentRegistry;
export function extendRegistry<const Definitions extends ComponentRecord>(
  registry: ComponentRegistry,
  extension: ComponentRegistry | RegistryDefinition<Definitions>
): ComponentRegistry {
  const next = 'bindings' in extension ? extension : defineRegistry(extension);

  return {
    bindings: [...registry.bindings, ...next.bindings],
    ...((next.props ?? registry.props) ? { props: next.props ?? registry.props } : {}),
    primitives: { ...registry.primitives, ...next.primitives },
    ...((next.types ?? registry.types) ? { types: next.types ?? registry.types } : {}),
  };
}

export function isHost(value: unknown): value is HostComponent {
  return typeof value === 'function' && REGISTRY_HOST in value;
}
