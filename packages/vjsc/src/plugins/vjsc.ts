import type { Plugin } from 'rolldown';

import type { StyleTransformOptions } from '../styles/options';
import type { ComponentTarget } from '../target/definition';
import type { VjscModule } from '../utils/module-id';
import { compilerDirectivePlugin } from './compiler-directive';
import { componentMetaPlugin } from './component-meta';
import { componentModulesPlugin } from './component-modules';
import { type ComponentTargetSelection, componentTargetPlugin, primitiveTargetPlugin } from './component-target';
import { htmlRuntimePlugin } from './html-runtime';
import { reactTargetPropsPlugin } from './react-target-props';
import { stylePlugin, type StylePluginDiagnostics, type StylePluginLifecycle } from './style';
import { targetImportCleanupPlugin } from './target-import-cleanup';
import { targetJsxPlugin } from './target-jsx';
import { targetTransformPlugin } from './target-transform';
import { targetTypePlugin } from './target-type';
import { templateTargetPlugin } from './template-target';

export interface VjscEntry {
  readonly filename: string;
}

export interface VjscEntriesOptions {
  readonly root: string;
  readonly include: string | readonly string[];
  readonly exclude?: string | readonly string[] | undefined;
  readonly resolve?:
    | {
        params(entry: VjscEntry): readonly Readonly<Record<string, string>>[];
      }
    | undefined;
}

export interface VjscTransformOptions {
  components(module: VjscModule): readonly ComponentTarget[] | null;
  styles(module: VjscModule): StyleTransformOptions | null | Promise<StyleTransformOptions | null>;
}

export interface VjscPluginOptions {
  readonly entries?: VjscEntriesOptions | undefined;
  readonly transform: VjscTransformOptions;
}

/**
 * Create the ordered compiler passes for query-selected component modules. Use this as the default VJSC integration for
 * Rolldown-compatible builds.
 *
 * @param options - Resolves targets and styles once for each module identity.
 */
export function vjscPlugin(options: VjscPluginOptions): Plugin[] {
  return createVjscPluginPipeline(options);
}

export function createVjscPluginPipeline(
  options: VjscPluginOptions,
  styleLifecycle?: StylePluginLifecycle,
  diagnostics: StylePluginDiagnostics = false
): Plugin[] {
  const componentTransforms = new Map<string, readonly ComponentTarget[] | null>();
  const styleTransforms = new Map<string, Promise<StyleTransformOptions | null>>();
  const components = (module: VjscModule): readonly ComponentTarget[] | null => {
    if (componentTransforms.has(module.id)) return componentTransforms.get(module.id) ?? null;

    const transform = options.transform.components(module);

    componentTransforms.set(module.id, transform);
    return transform;
  };
  const styles = (module: VjscModule): Promise<StyleTransformOptions | null> => {
    const cached = styleTransforms.get(module.id);
    if (cached) return cached;

    const transform = Promise.resolve(options.transform.styles(module));

    styleTransforms.set(module.id, transform);
    return transform;
  };
  const targets: ComponentTargetSelection = components;

  return [
    {
      name: 'vjsc',
      buildStart() {
        componentTransforms.clear();
        styleTransforms.clear();
      },
    },
    componentModulesPlugin({
      select: async (module) => components(module) !== null || (await styles(module)) !== null,
    }),
    htmlRuntimePlugin(),
    componentMetaPlugin(),
    targetJsxPlugin({ targets }),
    stylePlugin(styles, diagnostics, styleLifecycle),
    targetTransformPlugin({ targets }),
    compilerDirectivePlugin({ targets }),
    targetTypePlugin({ targets }),
    primitiveTargetPlugin({ targets }),
    componentTargetPlugin({ targets }),
    reactTargetPropsPlugin({ targets }),
    templateTargetPlugin({ targets }),
    targetImportCleanupPlugin({ targets }),
  ];
}
