import { walk } from 'oxc-walker';
import type { Plugin } from 'rolldown';

import { SCRIPT_MODULE_ID } from '../utils/module-id';
import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

/** Report compiler directives that were not consumed by a selected target transform. */
export function compilerDirectivePlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:compiler-directive',
    transform: {
      filter: { id: SCRIPT_MODULE_ID, code: /\$[A-Za-z]/ },
      handler(_code, id, transform) {
        if (selectComponentTargets(options.targets, id).length === 0 || !transform.ast) return null;

        walk(transform.ast, {
          enter(node) {
            if (node.type !== 'JSXAttribute' || node.name.type !== 'JSXIdentifier' || !node.name.name.startsWith('$')) {
              return;
            }

            throw Object.assign(
              new Error(
                `Unhandled VJSC compiler directive \`${node.name.name}\`.\n` +
                  'Reason: none of the selected target transforms consumed this compile-time prop.\n' +
                  'Recommendation: remove the directive or implement it in the target that owns its behavior.'
              ),
              { pos: node.start }
            );
          },
        });

        return null;
      },
    },
  };
}
