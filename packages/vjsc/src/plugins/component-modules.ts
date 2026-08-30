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
  return {
    name: 'vjsc:component-modules',
    resolveId: {
      order: 'pre',
      async handler(id, importer, resolveOptions) {
        const selected = await selectedModule(id, options.select);
        const inherited = importer ? await selectedModule(importer, options.select) : null;
        if (!selected && (!inherited || !id.startsWith('.'))) return null;

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
      const selected = await selectedModule(id, options.select);
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

async function selectedModule(
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
