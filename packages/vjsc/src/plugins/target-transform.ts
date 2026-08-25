import type { Plugin } from 'rolldown';

import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

/** Run compile-time transforms owned by the selected component targets. */
export function targetTransformPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:target-transform',
    transform: {
      filter: { id: SCRIPT_ID },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.ast || !transform.magicString) return null;

        const transforms = new Set(targets.flatMap((target) => target.transforms));
        let changed = false;

        for (const targetTransform of transforms) {
          changed =
            targetTransform.transform({
              code,
              id,
              ast: transform.ast,
              magicString: transform.magicString,
            }) || changed;
        }

        return changed ? { code: transform.magicString } : null;
      },
    },
  };
}
