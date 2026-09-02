import type { Plugin } from 'rolldown';

import { SCRIPT_MODULE_ID } from '../utils/module-id';
import { mergeModuleBuildMeta } from './component-meta';

/** Capture final transformed component source in module metadata. */
export function componentSourcePlugin(capture?: (id: string, source: string, meta: unknown) => void): Plugin {
  return {
    name: 'vjsc:component-source',
    transform: {
      order: 'post',
      filter: { id: SCRIPT_MODULE_ID },
      handler(code, id, transform) {
        const meta = this.getModuleInfo(id)?.meta;
        const source = transform.magicString?.toString() ?? code;

        capture?.(id, source, meta);

        return {
          meta: mergeModuleBuildMeta(meta, { moduleSource: source }),
        };
      },
    },
  };
}
