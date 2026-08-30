import type { RolldownPlugin } from 'rolldown';

import type { ModuleMeta } from '../components/meta';
import type { Graph } from './types';

/** Locate the graph capability exposed by `vjscPlugin` in normalized Rolldown plugins. */
export function findGraph<Node extends ModuleMeta = ModuleMeta>(
  plugins: readonly RolldownPlugin[]
): Graph<Node> | undefined {
  for (const plugin of plugins) {
    if (typeof plugin !== 'object' || !('name' in plugin) || plugin.name !== 'vjsc' || !('api' in plugin)) continue;

    return plugin.api as Graph<Node> | undefined;
  }

  return undefined;
}
