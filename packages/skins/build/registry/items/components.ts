import type { GraphModule } from 'vjsc/graph';
import type { RegistryModuleItem } from 'vjsc/shadcn';

import type { SkinModuleMeta } from '../../../src/meta.ts';
import { skinModuleSourcePath } from '../../config.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';
import { reactHelperDependency } from './support.ts';

export function componentItem(
  module: GraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'component' }>,
  target: RegistryTarget
): RegistryModuleItem<SkinModuleMeta> {
  const category = componentCategory(module.filename);
  const registryMeta = {
    role: 'component',
    framework: 'react',
    styling: target.styling,
    public: true,
  } satisfies VideojsRegistryMeta;

  return {
    name: meta.name,
    type: 'registry:ui',
    title: meta.title,
    description: meta.description,
    categories: ['media', category],
    docs: componentDocs(module, meta),
    registryDependencies: reactHelperDependency(target),
    meta: registryMeta,
    group: 'ui',
    directives: ['use client'],
    target: `ui/${meta.name}.tsx`,
    theme: true,
  };
}

export function exportedComponentName(module: GraphModule<SkinModuleMeta>): string {
  const match = /\bexport\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/.exec(module.source);

  if (!match) {
    throw new Error(`Registry component has no exported component: \`${skinModuleSourcePath(module.filename)}\`.`);
  }

  return match[1]!;
}

function componentCategory(filename: string): string {
  const match = /\/components\/([^/]+)\//.exec(filename);

  return match?.[1] ?? 'shared';
}

function componentDocs(
  module: GraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'component' }>
): string {
  const component = exportedComponentName(module);

  return `[\`${component}\` reference](https://videojs.org/docs/reference/${meta.name}/).`;
}
