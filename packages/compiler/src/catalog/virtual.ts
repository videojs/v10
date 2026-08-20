import type { VirtualModuleDefinition } from '../module-graph';
import type { DiscoverCatalogItemsOptions } from './meta';
import { createCatalogItemsModule } from './meta';

export interface VirtualCatalogDefinition {
  readonly discovery: DiscoverCatalogItemsOptions;
}

/** Expose a discovered catalog inventory through a stable bundler module. */
export function catalogVirtualModule(
  catalog: VirtualCatalogDefinition,
  id: VirtualModuleDefinition['id'] = 'virtual:vjsc/catalog'
): VirtualModuleDefinition {
  return {
    id,
    load: () => createCatalogItemsModule(catalog.discovery),
  };
}
