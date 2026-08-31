import type { MediaCapabilityDescriptor } from '@videojs/media';

/**
 * EXPLORATION (do not merge as-is): derive a React-style defaults object from capability descriptors — each writable
 * prop's `fallback` is its default.
 *
 * The hand-written `*MediaDefaultProps` objects gate `useSyncProps`' split between props synced to the Media instance
 * and props spread onto the native tag. Those objects are a hand-maintained shadow of the adapter's owned surface; if
 * adapters declared that surface as descriptors, this derivation would replace the shadow — and the preload drift the
 * test pins could not exist.
 */
export function deriveMediaDefaultProps(
  capabilities: readonly MediaCapabilityDescriptor<any>[],
  keys: readonly string[]
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const capability of capabilities) {
    for (const [name, prop] of Object.entries(capability.props) as [string, { fallback: unknown; readonly?: true }][]) {
      if (!keys.includes(name) || prop.readonly) continue;

      defaults[name] = prop.fallback;
    }
  }

  return defaults;
}
