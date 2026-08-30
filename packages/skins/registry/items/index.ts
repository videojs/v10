import type { ComponentGraph } from '../../../vjsc/src/graph/index.ts';
import type { VjscRegistryItem } from '../../../vjsc/src/shadcn/index.ts';
import { renderHtmlSkins } from '../../build/packages/html.ts';
import type { SkinModuleMeta } from '../../vjsc/meta.ts';
import { packageDir, registryUtils } from '../configure.ts';
import type { RegistryTarget } from '../targets.ts';
import { componentItem } from './components.ts';
import { htmlSkinItem, skinItem } from './skins.ts';
import { concernStyleItems, themeStyleItem } from './styles.ts';
import {
  isPrivateComponent,
  privateComponentItem,
  privateModuleItem,
  privateModuleName,
  utilsItem,
} from './support.ts';

export function registryItems(
  target: RegistryTarget
): (
  graph: ComponentGraph<SkinModuleMeta>
) => readonly VjscRegistryItem<SkinModuleMeta>[] | Promise<readonly VjscRegistryItem<SkinModuleMeta>[]> {
  return async (graph) => {
    if (target.framework === 'html') {
      const skins = await renderHtmlSkins(graph, {
        workspaceDir: resolve(packageDir, '../..'),
        styling: target.styling,
      });

      return [
        ...(await Promise.all(skins.map((skin) => htmlSkinItem(skin, graph, target)))),
        ...(target.styling === 'tailwind' ? [themeStyleItem(target)] : []),
      ];
    }

    const modules = [...graph.modules.values()];
    const items = modules.flatMap((module) => {
      if (module.filename === registryUtils) return [utilsItem(module, target)];

      if (module.transform.target !== target.framework || module.transform.style !== target.styling) return [];

      const meta = module.meta;
      if (meta?.type === 'skin') return module.transform.skin === meta.name ? [skinItem(module, meta, target)] : [];

      if (meta?.type === 'component') {
        if (module.transform.skin !== undefined) return [];

        return isPrivateComponent(meta.name)
          ? [privateComponentItem(module, meta, target, graph)]
          : [componentItem(module, meta, target, graph)];
      }

      if (module.transform.skin === undefined) {
        const name = privateModuleName(module);

        return name ? [privateModuleItem(module, name, target, graph)] : [];
      }

      return [];
    });

    return [...items, themeStyleItem(target), ...concernStyleItems(modules, target)];
  };
}
import { resolve } from 'node:path';
