import type { Plugin } from 'rolldown';

import type { VjscDiagnosticsOptions } from '../styles/diagnostics';
import type { StylePluginOptions } from '../styles/options';
import type { ComponentTarget } from '../target/definition';
import type { ParsedModuleId } from '../utils/module-id';
import { componentMetaPlugin } from './component-meta';
import { componentModulesPlugin } from './component-modules';
import { type ComponentTargetSelection, componentTargetPlugin, primitiveTargetPlugin } from './component-target';
import { htmlRuntimePlugin } from './html-runtime';
import { reactTargetPropsPlugin } from './react-target-props';
import { stylePlugin } from './style';
import { targetImportCleanupPlugin } from './target-import-cleanup';
import { targetJsxPlugin } from './target-jsx';
import { targetTransformPlugin } from './target-transform';
import { targetTypePlugin } from './target-type';
import { templateTargetPlugin } from './template-target';

export interface VjscModule extends ParsedModuleId {
  readonly id: string;
}

export interface VjscModuleConfig {
  readonly targets: readonly ComponentTarget[];
  readonly styles?: StylePluginOptions | undefined;
}

export interface VjscPluginOptions {
  /** Controls compiler warnings. Unsafe isolated-transform relationships always throw. */
  readonly diagnostics?: VjscDiagnosticsOptions | undefined;
  configure(module: VjscModule): VjscModuleConfig | null;
}

/**
 * Create the ordered compiler passes for query-selected component modules. Use this as the default VJSC integration for
 * Rolldown-compatible builds.
 *
 * @example
 *   Promote suspicious structural selectors to build errors.
 *   ```ts
 *   vjscPlugin({
 *   diagnostics: { complexSelectors: 'error' },
 *   configure,
 *   });
 *   ```
 *
 * @param options - Resolves targets and styles once for each module identity.
 */
export function vjscPlugin(options: VjscPluginOptions): Plugin[] {
  return createVjscPluginPipeline(options);
}

export function createVjscPluginPipeline(options: VjscPluginOptions): Plugin[] {
  const configurations = new Map<string, VjscModuleConfig | null>();
  const configure = (module: VjscModule): VjscModuleConfig | null => {
    if (configurations.has(module.id)) return configurations.get(module.id) ?? null;

    const config = options.configure(module);

    configurations.set(module.id, config);
    return config;
  };
  const targets: ComponentTargetSelection = (module) => configure(module)?.targets;

  return [
    {
      name: 'vjsc:config',
      buildStart() {
        configurations.clear();
      },
    },
    componentModulesPlugin({
      ignore: (module) => configure(module) === null,
    }),
    htmlRuntimePlugin(),
    componentMetaPlugin(),
    targetJsxPlugin({ targets }),
    stylePlugin((module) => configure(module)?.styles ?? null, options.diagnostics),
    targetTransformPlugin({ targets }),
    targetTypePlugin({ targets }),
    primitiveTargetPlugin({ targets }),
    componentTargetPlugin({ targets }),
    reactTargetPropsPlugin({ targets }),
    templateTargetPlugin({ targets }),
    targetImportCleanupPlugin({ targets }),
  ];
}
