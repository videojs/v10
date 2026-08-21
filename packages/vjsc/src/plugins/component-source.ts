import type { Plugin } from 'rolldown';

import { mergeComponentModuleMeta } from './component-meta';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

/**
 * Capture final transformed component source in module metadata.
 * Place after component transforms when a graph consumer needs editable source.
 *
 * @example
 * ```ts
 * plugins: [
 *   componentMetaPlugin(),
 *   componentSourcePlugin(), // after all source transforms
 *   shadcnPlugin(options),
 * ];
 * ```
 */
export function componentSourcePlugin(): Plugin {
  return {
    name: 'vjsc:component-source',
    transform: {
      filter: { id: SCRIPT_ID },
      handler(code, id) {
        return {
          meta: mergeComponentModuleMeta(this.getModuleInfo(id)?.meta, { componentSource: code }),
        };
      },
    },
  };
}
