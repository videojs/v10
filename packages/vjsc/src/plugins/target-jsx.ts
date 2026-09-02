import type { Plugin } from 'rolldown';

import { SCRIPT_MODULE_ID } from '../utils/module-id';
import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

const JSX_IMPORT_SOURCE = /@jsxImportSource\s+([^\s*]+)/;

export function targetJsxPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:target-jsx',
    transform: {
      filter: { id: SCRIPT_MODULE_ID, code: '<' },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.magicString) return null;

        const sources = new Set(targets.map((target) => target.jsx.importSource));

        if (sources.size !== 1)
          throw new Error('Component targets for one module must use the same JSX import source.');

        const source = [...sources][0]!;
        const declared = JSX_IMPORT_SOURCE.exec(code)?.[1];
        if (declared === source) return null;

        if (declared) throw new Error(`Module declares JSX import source \`${declared}\`, expected \`${source}\`.`);

        transform.magicString.prepend(`/** @jsxImportSource ${source} */\n`);
        return { code: transform.magicString };
      },
    },
  };
}
