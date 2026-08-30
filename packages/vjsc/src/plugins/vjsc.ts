import type { Plugin } from 'rolldown';

import type { ModuleMeta } from '../components/meta';
import type { Graph } from '../graph/types';
import type { StyleTransformOptions } from '../styles/options';
import type { ComponentTarget } from '../target/definition';
import type { TransformModule } from '../utils/module-id';
import { compilerDirectivePlugin } from './compiler-directive';
import { componentMetaPlugin } from './component-meta';
import { componentModulesPlugin } from './component-modules';
import { type ComponentTargetSelection, componentTargetPlugin, primitiveTargetPlugin } from './component-target';
import { createGraphCapability, graphPlugin } from './graph';
import { htmlRuntimePlugin } from './html-runtime';
import { reactTargetPropsPlugin } from './react-target-props';
import { stylePlugin, type StylePluginDiagnostics, type StylePluginLifecycle } from './style';
import { targetImportCleanupPlugin } from './target-import-cleanup';
import { targetJsxPlugin } from './target-jsx';
import { targetTransformPlugin } from './target-transform';
import { targetTypePlugin } from './target-type';
import { templateTargetPlugin } from './template-target';

export interface SourceEntry {
  readonly filename: string;
}

export interface EntriesOptions {
  readonly root: string;
  readonly include: string | readonly string[];
  readonly exclude?: string | readonly string[] | undefined;
  readonly resolve?:
    | {
        params(entry: SourceEntry): readonly Readonly<Record<string, string>>[];
      }
    | undefined;
}

export interface TransformOptions {
  components(module: TransformModule): readonly ComponentTarget[] | null;
  styles(module: TransformModule): StyleTransformOptions | null | Promise<StyleTransformOptions | null>;
}

export interface VjscPluginOptions {
  readonly entries?: EntriesOptions | undefined;
  readonly transform: TransformOptions;
}

/**
 * Create the ordered compiler passes for query-selected component modules. Use this as the default VJSC integration for
 * Rolldown-compatible builds.
 *
 * @param options - Resolves targets and styles once for each module identity.
 */
export function vjscPlugin<Node extends ModuleMeta = ModuleMeta>(options: VjscPluginOptions): Plugin[] {
  return createPluginPipeline<Node>(options);
}

export function createPluginPipeline<Node extends ModuleMeta = ModuleMeta>(
  options: VjscPluginOptions,
  styleLifecycle?: StylePluginLifecycle,
  diagnostics: StylePluginDiagnostics = false
): Plugin[] {
  const graph = createGraphCapability<Node>();
  const componentTransforms = new Map<string, readonly ComponentTarget[] | null>();
  const styleTransforms = new Map<string, Promise<StyleTransformOptions | null>>();
  const components = (module: TransformModule): readonly ComponentTarget[] | null => {
    if (componentTransforms.has(module.id)) return componentTransforms.get(module.id) ?? null;

    const transform = options.transform.components(module);

    componentTransforms.set(module.id, transform);
    return transform;
  };
  const styles = (module: TransformModule): Promise<StyleTransformOptions | null> => {
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
      api: graph.api as Graph,
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
    graphPlugin(options.entries, graph),
  ];
}
