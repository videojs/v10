import type { Plugin } from 'rolldown';

import { mergeVjscMeta } from './meta';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

export function editableSourcePlugin(): Plugin {
  return {
    name: 'vjsc:editable-source',
    transform: {
      filter: { id: SCRIPT_ID },
      handler(code, id) {
        return {
          meta: mergeVjscMeta(this.getModuleInfo(id)?.meta, { source: code }),
        };
      },
    },
  };
}
