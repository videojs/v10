import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import type { ModuleType, Plugin } from 'rolldown';

import { isVjscModule, moduleFilename, moduleId, type ParsedModuleId, parseModuleId } from '../utils/module-id';

export interface ComponentModuleContext extends ParsedModuleId {
  readonly id: string;
}

export interface ComponentModulesPluginOptions {
  readonly ignore?: ((module: ComponentModuleContext) => boolean) | undefined;
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
        const selected = selectedModule(id, options.ignore);
        const inherited = importer ? selectedModule(importer, options.ignore) : null;
        if (!selected && (!inherited || !id.startsWith('.'))) return null;

        const resolved = await this.resolve(selected?.filename ?? id, importer ? moduleFilename(importer) : undefined, {
          ...resolveOptions,
          skipSelf: true,
        });
        if (!resolved || resolved.external || !isVjscModule(resolved.id)) return resolved;

        return {
          ...resolved,
          id: moduleId(moduleFilename(resolved.id), selected?.parameters ?? inherited!.parameters),
        };
      },
    },
    async load(id) {
      const selected = selectedModule(id, options.ignore);
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

function selectedModule(
  id: string,
  ignore: ComponentModulesPluginOptions['ignore']
): (ComponentModuleContext & ParsedModuleId) | null {
  const parsed = parseModuleId(id);
  const module = { id, ...parsed };

  return parsed.parameters.size > 0 && isVjscModule(id) && !(ignore?.(module) ?? false) ? module : null;
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
