import type { VjscRegistryOptions } from 'vjsc/shadcn';

import type { SkinModuleMeta } from '../../../src/meta.ts';
import { renderHtmlSkins } from '../../packages/html.ts';
import type { RegistryTarget } from '../targets.ts';
import { htmlSkinItem } from './skins.ts';

/** HTML publishes rendered templates: one created item per skin, and no source modules. */
export function htmlRegistryItems(
  target: RegistryTarget & { framework: 'html' }
): VjscRegistryOptions<SkinModuleMeta>['items'] {
  return {
    resolve: () => null,
    async create({ graph }) {
      const skins = await renderHtmlSkins(graph, { styling: target.styling });

      return Promise.all(skins.map((skin) => htmlSkinItem(skin, graph, target)));
    },
  };
}
