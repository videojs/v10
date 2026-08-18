import type { ComponentDefinition, ComponentRecord, ComponentSet, EmptyProps, InferProps } from '../definition';
import type { Fragment, SlotProps, TextProps } from '../jsx-runtime';

export const REGISTRY_NODE = Symbol.for('vjsc/registry-node');
export const REGISTRY_TARGET = Symbol.for('vjsc/registry-target');
export const REGISTRY_HOST = Symbol.for('vjsc/registry-host');

export interface TargetNamedImport {
  readonly from: string;
  readonly name: string;
  readonly path?: readonly string[] | undefined;
}

export interface TargetSideEffectImport {
  readonly from: string;
  readonly sideEffect: true;
}

export type TargetReference =
  | {
      readonly import: TargetNamedImport;
      readonly tagName?: never;
    }
  | {
      readonly tagName: string;
      readonly import?: TargetSideEffectImport | undefined;
    };

export interface TargetRenderDefinition<Props extends object = EmptyProps> {
  readonly render: RegistryRender<Props>;
  readonly when?: RegistryCondition<Props> | undefined;
}

export type TargetDefinition<Props extends object = EmptyProps> = TargetReference | TargetRenderDefinition<Props>;

export interface RegistryNode {
  readonly [REGISTRY_NODE]: true;
  readonly type: RegistryElementType;
  readonly props: Record<string, unknown>;
  readonly key: string | number | null;
}

export interface RegistryTarget {
  /** Runtime target metadata; props are carried by `TargetComponent`. */
  readonly [REGISTRY_TARGET]: TargetDefinition<any>;
}

export interface RegistryHost {
  readonly [REGISTRY_HOST]: true;
}

export interface TargetComponent<Props extends object = Record<string, unknown>> extends RegistryTarget {
  (props: Props & { children?: unknown }): RegistryNode;
}

export interface HostComponent extends RegistryHost {
  (props: Record<string, unknown>): RegistryNode;
}

export const Host = Object.assign(
  (_props: Record<string, unknown>): RegistryNode => {
    throw new Error('vjsc/components: <Host> can only be evaluated by the registry JSX runtime.');
  },
  { [REGISTRY_HOST]: true as const }
);

export type RegistryElementType = TargetComponent | HostComponent | typeof Fragment;

export interface RegistryRenderContext<Props extends object = EmptyProps> {
  readonly props: Props & { readonly children?: unknown };
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
> {
  readonly root: RegistryPart<InferProps<Parts[Root]>>;
  readonly parts: PartCollections<Parts, Root>;
}

export type RegistryRender<Props extends object = EmptyProps> = (context: RegistryRenderContext<Props>) => unknown;

export type RegistryCondition<Props extends object = EmptyProps> = (context: RegistryRenderContext<Props>) => unknown;

export type RegistryPartTransform<Props extends object = EmptyProps> =
  | HostComponent
  | RegistryTarget
  | typeof Fragment
  | RegistryRender<Props>;

type PartTransforms<Parts extends ComponentRecord> = {
  readonly [Part in keyof Parts]: RegistryPartTransform<InferProps<Parts[Part]>>;
};

type RegistryComponentRender<Parts extends ComponentRecord, Root extends keyof Parts & string> = (
  context: RegistryComponentContext<Parts, Root>
) => RegistryNode;

export interface RegistryTemplateAttachment {
  /** Prop receiving the generated render callback on the template's parent. */
  readonly prop: string;
  /** Callback parameters exposed as non-forwarded template props. */
  readonly parameters: readonly string[];
  /** Callback parameter spread onto the rendered template root. */
  readonly spread?: string | undefined;
}

export interface RegistryTemplate {
  /** Optional wrapper emitted around the authored template content. */
  readonly target?: TargetComponent | undefined;
  /** Optional target replacing the single authored template root. */
  readonly root?: TargetComponent | undefined;
  /** Attach the template as a render prop instead of emitting it as a child. */
  readonly attach?: RegistryTemplateAttachment | undefined;
  /** Template-local transforms keyed by `<Template.Part name>`. */
  readonly parts?: Readonly<Record<string, RegistryPartTransform<Record<string, unknown>>>> | undefined;
}

export interface RegistryPrimitives {
  readonly Slot?: RegistryPartTransform<SlotProps> | undefined;
  readonly Text?: RegistryPartTransform<TextProps> | undefined;
  readonly Template?: Readonly<Record<string, RegistryTemplate>> | undefined;
}

type DefinedParts<Definition> = Definition extends { readonly parts?: infer Parts } ? Exclude<Parts, undefined> : never;

type WholeComponentTransform<
  Definition extends ComponentDefinition<object, ComponentRecord | undefined>,
  Parts extends ComponentRecord,
> = Definition['root'] extends keyof Parts & string
  ? {
      readonly host?: PartialRegistryTargetTree<Definition> | undefined;
      readonly render: RegistryComponentRender<Parts, Definition['root']>;
      readonly parts?: never;
      readonly imports?: readonly string[] | undefined;
    }
  : never;

type CompoundRegistryEntry<
  Definition extends ComponentDefinition<object, ComponentRecord | undefined>,
  Parts extends ComponentRecord,
> =
  | RegistryTargetTree<Definition>
  | {
      readonly host?: PartialRegistryTargetTree<Definition> | undefined;
      readonly parts: PartTransforms<Parts>;
      readonly render?: never;
      readonly imports?: readonly string[] | undefined;
    }
  | WholeComponentTransform<Definition, Parts>;

type LeafRegistryEntry<Definition extends ComponentDefinition<object, ComponentRecord | undefined>> =
  | RegistryTarget
  | {
      readonly host?: RegistryTarget | undefined;
      readonly render?: RegistryPartTransform<InferProps<Definition>> | undefined;
      readonly imports?: readonly string[] | undefined;
    };

export type RegistryEntry<Definition extends ComponentDefinition<object, ComponentRecord | undefined>> = [
  DefinedParts<Definition>,
] extends [never]
  ? LeafRegistryEntry<Definition>
  : CompoundRegistryEntry<Definition, Extract<DefinedParts<Definition>, ComponentRecord>>;

export type RegistryEntries<Definitions extends ComponentRecord> = {
  readonly [Name in keyof Definitions]: RegistryEntry<Definitions[Name]>;
};

export interface ComponentRegistry {
  readonly components: ComponentSet;
  readonly entries: Readonly<Record<string, unknown>>;
  readonly primitives: RegistryPrimitives;
}

export interface DefinedComponentRegistry<Definitions extends ComponentRecord> extends ComponentRegistry {
  readonly components: ComponentSet<Definitions>;
  readonly entries: RegistryEntries<Definitions>;
}

type RegistryTargetTree<Definition extends ComponentDefinition<object, ComponentRecord | undefined>> = [
  DefinedParts<Definition>,
] extends [never]
  ? RegistryTarget
  : {
      readonly [Part in keyof DefinedParts<Definition>]: RegistryTargetTree<DefinedParts<Definition>[Part]>;
    };

type PartialRegistryTargetTree<Definition extends ComponentDefinition<object, ComponentRecord | undefined>> = [
  DefinedParts<Definition>,
] extends [never]
  ? RegistryTarget
  : {
      readonly [Part in keyof DefinedParts<Definition>]?: PartialRegistryTargetTree<DefinedParts<Definition>[Part]>;
    };

export function defineTarget<Props extends object = Record<string, unknown>>(
  definition: TargetDefinition<Props>
): TargetComponent<Props> {
  const target = (_props: Props & { children?: unknown }): RegistryNode => {
    throw new Error('vjsc/components: target components can only be evaluated by the registry JSX runtime.');
  };

  return Object.assign(target, { [REGISTRY_TARGET]: definition });
}

export function defineRegistry<const Definitions extends ComponentRecord>(
  components: ComponentSet<Definitions>,
  entries: RegistryEntries<NoInfer<Definitions>>,
  primitives: RegistryPrimitives = {}
): DefinedComponentRegistry<Definitions> {
  return { components, entries, primitives };
}

export function isHost(value: unknown): value is HostComponent {
  return typeof value === 'function' && REGISTRY_HOST in value;
}

export function isTargetComponent(value: unknown): value is TargetComponent {
  return typeof value === 'function' && REGISTRY_TARGET in value;
}
