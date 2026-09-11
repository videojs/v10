import type { RegistryTarget } from './targets.ts';

const docsOrigin = 'https://videojs.org/docs/framework';

/** Link registry metadata to the framework route the documentation site publishes. */
export function registryDocsUrl(target: RegistryTarget, slug: string): string {
  return `${docsOrigin}/${target.framework}/${slug}/`;
}
