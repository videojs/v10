import type { RolldownPlugin } from 'rolldown';

import type { ModuleMeta } from '../components/meta';
import type { VjscGraph } from './types';

/** Locate the graph capability exposed by `vjscPlugin` in normalized Rolldown plugins. */
export function findVjscGraph<Meta extends ModuleMeta = ModuleMeta>(
  plugins: readonly RolldownPlugin[]
): VjscGraph<Meta> | undefined {
  for (const plugin of plugins) {
    if (typeof plugin !== 'object' || !('name' in plugin) || plugin.name !== 'vjsc' || !('api' in plugin)) continue;

    return plugin.api as VjscGraph<Meta> | undefined;
  }

  return undefined;
}
