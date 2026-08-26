import type { StylePluginLifecycle } from '../plugins/style';
import { toPosixPath } from '../utils/path';
import type { ViteOxcPlugin } from './oxc';

interface ViteModuleNode {
  readonly id: string | null;
  readonly url: string;
}

interface LoadedViteModuleNode extends ViteModuleNode {
  readonly id: string;
}

interface ViteTransformResult {
  readonly code: string;
}

interface ViteHotUpdateContext {
  readonly environment: {
    readonly moduleGraph: {
      getModuleById(id: string): ViteModuleNode | undefined;
      invalidateModule(module: ViteModuleNode, seen: Set<ViteModuleNode>, timestamp: number, isHmr: boolean): void;
    };
    transformRequest(url: string): Promise<ViteTransformResult | null>;
    waitForRequestsIdle(id?: string): Promise<void>;
  };
}

interface ViteHotUpdateOptions {
  readonly type: 'create' | 'update' | 'delete';
  readonly file: string;
  readonly timestamp: number;
  readonly modules: ViteModuleNode[];
}

interface ViteStyleHmr {
  readonly lifecycle: StylePluginLifecycle;
  readonly plugin: ViteOxcPlugin;
}

interface ViteStyleHmrPlugin extends ViteOxcPlugin {
  readonly hotUpdate: {
    readonly order: 'pre';
    handler(this: ViteHotUpdateContext, options: ViteHotUpdateOptions): Promise<readonly ViteModuleNode[] | undefined>;
  };
}

/** Keep generated CSS synchronized when a VJSC owner is replaced in place. */
export function createViteStyleHmr(): ViteStyleHmr {
  const owners = new Set<string>();
  const ownerWatchFiles = new Map<string, ReadonlySet<string>>();
  const changedCss = new Set<string>();
  let collecting = false;

  const lifecycle: StylePluginLifecycle = {
    retainReleasedCss: true,
    onCssChange(id) {
      if (collecting) changedCss.add(id);
    },
    onOwnerTransform(id, watchFiles) {
      owners.add(id);
      ownerWatchFiles.set(id, new Set(watchFiles.map(toPosixPath)));
    },
  };
  const plugin: ViteStyleHmrPlugin = {
    name: 'vjsc:style-hmr',
    enforce: 'pre',
    hotUpdate: {
      order: 'pre',
      async handler(this: ViteHotUpdateContext, options: ViteHotUpdateOptions) {
        if (options.type !== 'update') return;

        const changedFile = toPosixPath(options.file);
        const dependencyOwners = [...ownerWatchFiles]
          .filter(([, watchFiles]) => watchFiles.has(changedFile))
          .map(([id]) => this.environment.moduleGraph.getModuleById(id))
          .filter(isTrackedOwner);
        const affectedOwners = uniqueLoadedModules([...options.modules.filter(isTrackedOwner), ...dependencyOwners]);
        if (affectedOwners.length === 0) return;

        changedCss.clear();
        collecting = true;

        try {
          for (const module of affectedOwners) {
            this.environment.moduleGraph.invalidateModule(module, new Set(), options.timestamp, true);
          }

          for (const module of affectedOwners) await this.environment.transformRequest(module.url);

          await Promise.all(affectedOwners.map((module) => this.environment.waitForRequestsIdle(module.id)));
        } finally {
          collecting = false;
        }

        const cssModules = [...changedCss]
          .map((id) => this.environment.moduleGraph.getModuleById(`\0${id}`))
          .filter((module): module is ViteModuleNode => module !== undefined);

        return uniqueModules([...options.modules, ...cssModules]);
      },
    },
  };

  return { lifecycle, plugin };

  function isTrackedOwner(module: ViteModuleNode | undefined): module is LoadedViteModuleNode {
    return module !== undefined && module.id !== null && owners.has(module.id);
  }
}

function uniqueModules(modules: readonly ViteModuleNode[]): ViteModuleNode[] {
  return [...new Map(modules.map((module) => [module.id, module])).values()];
}

function uniqueLoadedModules(modules: readonly LoadedViteModuleNode[]): LoadedViteModuleNode[] {
  return [...new Map(modules.map((module) => [module.id, module])).values()];
}
