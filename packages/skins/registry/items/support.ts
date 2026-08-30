import type { ComponentGraph, ComponentGraphModule } from '../../../vjsc/src/graph/index.ts';
import type { VjscRegistryItem } from '../../../vjsc/src/shadcn/index.ts';
import type { SkinModuleMeta } from '../../vjsc/meta.ts';
import { registryModuleSourcePath } from '../configure.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';
import { sourceStyles } from './styles.ts';

const privateComponents = new Set(['button-tooltip']);
const privateModules = new Map([['components/menus/menu-chevron.tsx', '_menu-chevron']]);

export function isPrivateComponent(name: string): boolean {
  return privateComponents.has(name);
}

export function privateModuleName(module: ComponentGraphModule<SkinModuleMeta>): string | undefined {
  return privateModules.get(registryModuleSourcePath(module.filename));
}

export function privateComponentItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'component' }>,
  target: RegistryTarget,
  graph: ComponentGraph<SkinModuleMeta>
): VjscRegistryItem<SkinModuleMeta> {
  const styles = sourceStyles(module, target, graph);

  return {
    name: `_${meta.name}`,
    type: 'registry:lib',
    title: meta.title,
    description: `Private ${meta.description.charAt(0).toLowerCase()}${meta.description.slice(1)}`,
    docs: 'Installed automatically by the Video.js controls that use it.',
    registryDependencies: [...reactHelperDependency(target), ...styles.dependencies],
    meta: {
      role: 'support',
      framework: 'react',
      styling: target.styling,
      public: false,
    } satisfies VideojsRegistryMeta,
    $vjsc: {
      module,
      group: 'support',
      target: `ui/${meta.name}.tsx`,
      styleImports: styles.imports,
    },
  };
}

export function privateModuleItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  name: string,
  target: RegistryTarget,
  graph: ComponentGraph<SkinModuleMeta>
): VjscRegistryItem<SkinModuleMeta> {
  const sourcePath = registryModuleSourcePath(module.filename);
  const output = sourcePath.slice('components/'.length);
  const styles = sourceStyles(module, target, graph);
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
    registryDependencies: [...reactHelperDependency(target), ...styles.dependencies],
    meta: registryMeta,
    $vjsc: {
      module,
      group: 'support',
      target: `ui/${output.slice(output.lastIndexOf('/') + 1)}`,
      styleImports: styles.imports,
    },
  };
}

export function utilsItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  target: RegistryTarget
): VjscRegistryItem<SkinModuleMeta> {
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
    $vjsc: {
      module,
      group: 'support',
      filename: 'resolve-class-name.ts',
      target: 'lib/resolve-class-name.ts',
      imports: {
        '@videojs/utils/style': '@/lib/utils',
      },
    },
  };
}

export function reactHelperDependency(target: RegistryTarget): string[] {
  return target.framework === 'react' ? ['@videojs/_resolve-class-name'] : [];
}
