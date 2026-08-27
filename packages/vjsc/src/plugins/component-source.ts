import type { Plugin } from 'rolldown';

import { mergeComponentModuleMeta } from './component-meta';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

/**
 * Capture final transformed component source in module metadata. Used internally by graph emitters such as
 * `shadcnPlugin`.
 */
export function componentSourcePlugin(capture?: (id: string, source: string) => void): Plugin {
  return {
    name: 'vjsc:component-source',
    transform: {
      order: 'post',
      filter: { id: SCRIPT_ID },
      handler(code, id) {
        capture?.(id, code);

        return {
          meta: mergeComponentModuleMeta(this.getModuleInfo(id)?.meta, { componentSource: code }),
        };
      },
    },
  };
}
