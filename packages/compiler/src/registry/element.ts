import type { RegistryElement, RegistryEntry, RegistryNode } from './definition';

export const REGISTRY_ENTRY = Symbol.for('vjsc/registry-entry');

export function createRegistryElement<
  Props extends object = Record<string, unknown>,
  Entry extends RegistryEntry<Props> = RegistryEntry<Props>,
>(entry: Entry): RegistryElement<Props> & Entry {
  const element = (_props: Props & { children?: unknown }): RegistryNode => {
    throw new Error('vjsc/registry: registry elements can only be evaluated by the registry JSX runtime.');
  };

  const registryElement: RegistryElement<Props> = Object.assign(element, { [REGISTRY_ENTRY]: entry });

  return Object.assign(registryElement, entry);
}

export function isRegistryElement(value: unknown): value is RegistryElement {
  return typeof value === 'function' && REGISTRY_ENTRY in value;
}

export function normalizeRegistryElement(value: unknown): RegistryElement | undefined {
  if (isRegistryElement(value)) return value;
  return isRegistryEntry(value) ? createRegistryElement(value) : undefined;
}

function isRegistryEntry(value: unknown): value is RegistryEntry {
  if (!value || typeof value !== 'object') return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.tagName === 'string' ||
    (entry.import !== undefined && typeof entry.import === 'object') ||
    typeof entry.transform === 'function' ||
    (typeof entry.render === 'function' && !('host' in entry) && !('parts' in entry))
  );
}
