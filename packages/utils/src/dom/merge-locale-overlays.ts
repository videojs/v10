/**
 * Loads overlay layers for each tag in {@link localeLookupChain}, least-specific first, then merges
 * most-specific-last (same semantics as the core i18n registry).
 */
export async function mergeLocaleOverlays<Overlay extends object>(
  locale: string,
  load: (tag: string) => Promise<Partial<Overlay> | undefined>,
  localeLookupChain: (locale: string) => string[]
): Promise<Partial<Overlay>> {
  const chain = localeLookupChain(locale);
  const layers = await Promise.all(chain.map((tag) => load(tag)));
  const merged: Partial<Overlay> = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer) {
      Object.assign(merged, layer);
    }
  }
  return merged;
}
