import type { ComponentGraph, ComponentGraphModule } from '../../../vjsc/src/graph/index.ts';
import type { VjscRegistryItem } from '../../../vjsc/src/shadcn/index.ts';
import type { SkinModuleMeta } from '../../vjsc/meta.ts';
import { registryModuleSourcePath } from '../configure.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import { registryPaths, type RegistryTarget } from '../targets.ts';
import { sourceStyles } from './styles.ts';
import { reactHelperDependency } from './support.ts';

export function componentItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'component' }>,
  target: RegistryTarget,
  graph: ComponentGraph<SkinModuleMeta>
): VjscRegistryItem<SkinModuleMeta> {
  const category = componentCategory(module.filename);
  const styles = sourceStyles(module, target, graph);
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
    registryDependencies: [...reactHelperDependency(target), ...styles.dependencies],
    meta: registryMeta,
    $vjsc: {
      module,
      group: 'ui',
      target: `ui/${meta.name}.tsx`,
      styleImports: styles.imports,
    },
  };
}

export function exportedComponentName(module: ComponentGraphModule<SkinModuleMeta>): string {
  const match = /\bexport\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/.exec(module.source);

  if (!match) {
    throw new Error(`Registry component has no exported component: \`${registryModuleSourcePath(module.filename)}\`.`);
  }

  return match[1]!;
}

function componentCategory(filename: string): string {
  const match = /\/components\/([^/]+)\//.exec(filename);

  return match?.[1] ?? 'shared';
}

function componentDocs(
  module: ComponentGraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'component' }>
): string {
  const component = exportedComponentName(module);

  return `Installs \`${registryPaths.import}/ui/${meta.name}.tsx\` for use inside a compatible Video.js Player or Skin.

\`\`\`tsx
import { ${component} } from '${registryPaths.import}/ui/${meta.name}';

export function Controls() {
  return <${component} />;
}
\`\`\``;
}
