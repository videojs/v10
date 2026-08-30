import type { GraphModule } from '../../../../vjsc/src/graph/index.ts';
import type { RegistryModuleItem } from '../../../../vjsc/src/shadcn/index.ts';
import type { SkinModuleMeta } from '../../../src/meta.ts';
import { skinModuleSourcePath } from '../../config.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';

const privateComponents = new Set(['button-tooltip']);
const privateModules = new Map([['components/menus/menu-chevron.tsx', '_menu-chevron']]);

export function isPrivateComponent(name: string): boolean {
  return privateComponents.has(name);
}

export function privateModuleName(module: GraphModule<SkinModuleMeta>): string | undefined {
  return privateModules.get(skinModuleSourcePath(module.filename));
}

export function privateComponentItem(
  meta: Extract<SkinModuleMeta, { type: 'component' }>,
  target: RegistryTarget
): RegistryModuleItem<SkinModuleMeta> {
  return {
    name: `_${meta.name}`,
    type: 'registry:lib',
    title: meta.title,
    description: `Private ${meta.description.charAt(0).toLowerCase()}${meta.description.slice(1)}`,
    docs: 'Installed automatically by the Video.js controls that use it.',
    registryDependencies: reactHelperDependency(target),
    meta: {
      role: 'support',
      framework: 'react',
      styling: target.styling,
      public: false,
    } satisfies VideojsRegistryMeta,
    group: 'support',
    target: `ui/${meta.name}.tsx`,
  };
}

export function privateModuleItem(
  module: GraphModule<SkinModuleMeta>,
  name: string,
  target: RegistryTarget
): RegistryModuleItem<SkinModuleMeta> {
  const sourcePath = skinModuleSourcePath(module.filename);
  const output = sourcePath.slice('components/'.length);
  const registryMeta = {
    role: 'support',
    framework: target.framework,
    styling: target.styling,
    public: false,
  } satisfies VideojsRegistryMeta;

  return {
    name,
    type: 'registry:lib',
    title: 'Video.js Menu Chevron',
    description: 'Private menu direction indicator shared by editable Video.js menu components.',
    docs: 'Installed automatically by the Video.js menu components that use it.',
    registryDependencies: reactHelperDependency(target),
    meta: registryMeta,
    group: 'support',
    target: `ui/${output.slice(output.lastIndexOf('/') + 1)}`,
  };
}

export function utilsItem(target: RegistryTarget): RegistryModuleItem<SkinModuleMeta> {
  return {
    name: '_resolve-class-name',
    type: 'registry:lib',
    title: 'Video.js Utilities',
    description: 'Resolves state-aware class names used by editable Video.js React components.',
    docs: 'Installed automatically with React components and composed with the project Shadcn `cn` utility.',
    registryDependencies: ['utils'],
    meta: {
      role: 'support',
      framework: 'react',
      styling: target.styling,
      public: false,
    } satisfies VideojsRegistryMeta,
    group: 'support',
    filename: 'resolve-class-name.ts',
    target: 'lib/resolve-class-name.ts',
    imports: {
      '@videojs/utils/style': '@/lib/utils',
    },
  };
}

export function reactHelperDependency(target: RegistryTarget): string[] {
  return target.framework === 'react' ? ['@videojs/_resolve-class-name'] : [];
}
