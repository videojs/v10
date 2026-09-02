import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import type { ModuleType, Plugin } from 'rolldown';

import { isScriptModule, moduleFilename, moduleId, parseModuleId, type TransformModule } from '../utils/module-id';

export interface ComponentModulesPluginOptions {
  readonly select?: ((module: TransformModule) => boolean | Promise<boolean>) | undefined;
}

/**
 * Carry a component transform query through relative runtime imports. Use before component transforms when one source
 * tree is built for multiple targets.
 *
 * @example
 *   An import from `entry.tsx?target=react` inherits its transform query:
 *   ```diff
 *   - icon.tsx
 *   + icon.tsx?target=react
 *   ```
 *
 * @param options - Controls which query-bearing modules participate.
 */
export function componentModulesPlugin(options: ComponentModulesPluginOptions = {}): Plugin {
  const selections = new Map<string, Promise<TransformModule | null>>();
  const selectedModule = (id: string): Promise<TransformModule | null> => {
    let selection = selections.get(id);

    if (!selection) {
      selection = selectModule(id, options.select);
      selections.set(id, selection);
    }

    return selection;
  };

  return {
    name: 'vjsc:component-modules',
    buildStart() {
      selections.clear();
    },
    resolveId: {
      order: 'pre',
      async handler(id, importer, resolveOptions) {
        // Only query-bearing ids can be selected, and only relative ids can inherit a selection.
        const relative = id.startsWith('.');
        if (!id.includes('?') && (!relative || !importer?.includes('?'))) return null;

        const selected = id.includes('?') ? await selectedModule(id) : null;
        const inherited = relative && importer?.includes('?') ? await selectedModule(importer) : null;
        if (!selected && (!inherited || !relative)) return null;

        const resolved = await this.resolve(selected?.filename ?? id, importer ? moduleFilename(importer) : undefined, {
          ...resolveOptions,
          skipSelf: true,
        });
        if (!resolved || resolved.external || !isScriptModule(resolved.id)) return resolved;

        return {
          ...resolved,
          id: moduleId(moduleFilename(resolved.id), selected?.params ?? inherited!.params),
        };
      },
    },
    async load(id) {
      const selected = id.includes('?') ? await selectedModule(id) : null;
      if (!selected) return null;

      this.addWatchFile(selected.filename);
      const code = await readFile(selected.filename, 'utf8');

      return {
        code,
        moduleType: scriptModuleType(selected.filename),
      };
    },
  };
}

async function selectModule(
  id: string,
  select: ComponentModulesPluginOptions['select']
): Promise<TransformModule | null> {
  const parsed = parseModuleId(id);

  return parsed.params.size > 0 && isScriptModule(id) && (select ? await select(parsed) : true) ? parsed : null;
}

function scriptModuleType(filename: string): ModuleType {
  switch (extname(filename)) {
    case '.tsx':
      return 'tsx';
    case '.jsx':
      return 'jsx';
    case '.ts':
    case '.mts':
    case '.cts':
      return 'ts';
    default:
      return 'js';
  }
}
