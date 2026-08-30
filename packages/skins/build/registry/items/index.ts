import { resolve } from 'node:path';

import type { VjscRegistryOptions } from '../../../../vjsc/src/shadcn/index.ts';
import type { SkinModuleMeta } from '../../../src/meta.ts';
import { packageDir, skinUtils } from '../../config.ts';
import { renderHtmlSkins } from '../../packages/html.ts';
import type { RegistryTarget } from '../targets.ts';
import { componentItem } from './components.ts';
import { htmlSkinItem, skinItem } from './skins.ts';
import {
  isPrivateComponent,
  privateComponentItem,
  privateModuleItem,
  privateModuleName,
  utilsItem,
} from './support.ts';

export function registryItems(target: RegistryTarget): VjscRegistryOptions<SkinModuleMeta>['items'] {
  return {
    resolve({ module }) {
      if (target.framework === 'html') return null;

      if (module.filename === skinUtils) return utilsItem(target);

      if (module.params.target !== target.framework || module.params.style !== target.styling) return null;

      const meta = module.meta;
      if (meta?.type === 'skin') return module.params.skin === meta.name ? skinItem(module, meta, target) : null;

      if (meta?.type === 'component') {
        if (module.params.skin !== undefined) return null;

        return isPrivateComponent(meta.name) ? privateComponentItem(meta, target) : componentItem(module, meta, target);
      }

      if (module.params.skin !== undefined) return null;

      const name = privateModuleName(module);

      return name ? privateModuleItem(module, name, target) : null;
    },
    async create({ graph }) {
      if (target.framework !== 'html') return [];

      const skins = await renderHtmlSkins(graph, {
        workspaceDir: resolve(packageDir, '../..'),
        styling: target.styling,
      });

      return Promise.all(skins.map((skin) => htmlSkinItem(skin, graph, target)));
    },
  };
}
