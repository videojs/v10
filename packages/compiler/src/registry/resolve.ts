import type { ComponentDefinition, ComponentRecord, ComponentSchema } from '../components/definition';
import type { RegistryEntryReference } from './definition';

export interface SchemaEntryContext {
  readonly component: string;
  readonly part: string | null;
}

export type SchemaEntryResolver<Entry extends RegistryEntryReference = RegistryEntryReference> = (
  context: SchemaEntryContext
) => Entry | undefined;

type DefinedParts<Definition> = Definition extends { readonly parts?: infer Parts } ? Exclude<Parts, undefined> : never;

export type ResolvedRegistryEntryTree<
  Definition extends ComponentDefinition<object, ComponentRecord | undefined>,
  Entry extends RegistryEntryReference = RegistryEntryReference,
> = [DefinedParts<Definition>] extends [never]
  ? Entry
  : {
      readonly [Part in keyof DefinedParts<Definition>]: ResolvedRegistryEntryTree<
        Extract<DefinedParts<Definition>[Part], ComponentDefinition<object, ComponentRecord | undefined>>,
        Entry
      >;
    };

export type ResolvedRegistryEntries<
  Definitions extends ComponentRecord,
  Entry extends RegistryEntryReference = RegistryEntryReference,
> = {
  readonly [Name in keyof Definitions]: ResolvedRegistryEntryTree<Definitions[Name], Entry>;
};

/** Resolve one reference tree for every component and part in a concrete schema. */
export function resolveRegistryEntries<
  const Definitions extends ComponentRecord,
  Entry extends RegistryEntryReference = RegistryEntryReference,
>(
  schema: ComponentSchema<Definitions>,
  resolve: SchemaEntryResolver<Entry>
): ResolvedRegistryEntries<Definitions, Entry> {
  return Object.fromEntries(
    Object.entries(schema.definitions).map(([name, definition]) => [name, resolveDefinition(name, definition, resolve)])
  ) as ResolvedRegistryEntries<Definitions, Entry>;
}

function resolveDefinition<Entry extends RegistryEntryReference>(
  component: string,
  definition: ComponentDefinition<object, ComponentRecord | undefined>,
  resolve: SchemaEntryResolver<Entry>,
  part: string | null = null
): Entry | Readonly<Record<string, unknown>> {
  if (!definition.parts) {
    const entry = resolve({ component, part });
    if (!entry) {
      throw new Error(`Entry resolver did not provide an implementation for <${component}${part ? `.${part}` : ''}>.`);
    }
    return entry;
  }

  return Object.fromEntries(
    Object.entries(definition.parts).map(([name, child]) => [
      name,
      resolveDefinition(component, child, resolve, part ? `${part}.${name}` : name),
    ])
  );
}
