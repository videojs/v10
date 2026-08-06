import { isObject } from '@videojs/utils/predicate';
import { compareStrings } from './groups';

export type ArtifactMetadataValue =
  | string
  | number
  | boolean
  | null
  | readonly ArtifactMetadataValue[]
  | { readonly [key: string]: ArtifactMetadataValue };
export type ArtifactMetadata = Readonly<Record<string, ArtifactMetadataValue>>;

/** Opaque resource groups whose names and meaning are owned by the artifact consumer. */
export type ArtifactResources = Readonly<Record<string, readonly string[]>>;

/** Named imports grouped by the consumer-provided `dependencyModules` classification. */
export type ArtifactSymbols = Readonly<Record<string, readonly string[]>>;

export interface ArtifactDefinition<
  Kind extends string = string,
  Metadata extends ArtifactMetadata = ArtifactMetadata,
> {
  id: string;
  kind: Kind;
  entry: string;
  resources?: ArtifactResources | undefined;
  metadata?: Metadata | undefined;
}

/** Preserve literal artifact metadata while checking the authored contract. */
export function defineArtifact<const Definition extends ArtifactDefinition>(definition: Definition): Definition {
  return definition;
}

export function normalizeArtifactMetadata(metadata: ArtifactMetadata): ArtifactMetadata {
  return normalizeMetadataValue(metadata) as ArtifactMetadata;
}

function normalizeMetadataValue(value: ArtifactMetadataValue): ArtifactMetadataValue {
  if (Array.isArray(value)) return value.map(normalizeMetadataValue);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => compareStrings(a, b))
        .map(([key, item]) => [key, normalizeMetadataValue(item)])
    );
  }
  return value;
}
