import type { Plugin } from 'rolldown';

import { SCRIPT_MODULE_ID } from '../../../utils/module-id';

/** Report each module's final transformed source, after every compiler pass has run. */
export function componentSourcePlugin(capture: (id: string, source: string) => void): Plugin {
  return {
    name: 'vjsc:component-source',
    transform: {
      order: 'post',
      filter: { id: SCRIPT_MODULE_ID },
      handler(code, id, transform) {
        capture(id, transform.magicString?.toString() ?? code);

        return null;
      },
    },
  };
}
