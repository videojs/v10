import { posix } from 'node:path';
import {
  createShadcnRegistry,
  type ShadcnRegistry,
  type ShadcnRegistryFile,
  type ShadcnRegistryFileType,
} from '@videojs/compiler/registry';
import type { SkinRegistryConfig } from '../../canonical/registry/config';
import type { SkinCatalog } from '../catalog';
import type { RegistrySourceOutput, SkinRegistryFile } from './source';

/** Create the shadcn manifest for the generated React/Tailwind projection. */
export function createRegistryManifest(
  catalog: SkinCatalog,
  output: RegistrySourceOutput,
  config: SkinRegistryConfig
): ShadcnRegistry {
  const meta = { framework: config.framework, style: config.style, skin: config.skin } as const;
  return createShadcnRegistry(catalog, {
    name: config.name,
    homepage: config.homepage,
    namespace: config.namespace,
    publishedItems: config.items,
    emittedItems: Object.fromEntries(
      Object.entries(output.items).map(([name, files]) => [
        name,
        { files, packageDependencies: output.packageDependenciesByItem[name] ?? [] },
      ])
    ),
    shared: [
      {
        ...config.styleItem,
        type: 'registry:style',
        files: output.sharedFiles,
        meta,
      },
      {
        ...config.utilityItem,
        type: 'registry:lib',
        files: output.utilityFiles,
        meta,
      },
    ],
    describeItem: (item) => ({
      type: item.type === 'skin' ? 'registry:block' : 'registry:component',
      title: item.title,
      description: item.description,
      meta,
    }),
    registryDependencies: ({ bundledItems }) => [
      config.styleItem.name,
      ...(bundledItems.some((item) => output.utilityDependenciesByItem[item.name]) ? [config.utilityItem.name] : []),
    ],
    mapFile: (file, owner) =>
      registryFile(file, owner, config, owner === config.utilityItem.name ? 'registry:lib' : undefined),
  });
}

function registryFile(
  file: SkinRegistryFile,
  owner: string,
  config: SkinRegistryConfig,
  sourceType?: ShadcnRegistryFileType
): ShadcnRegistryFile {
  return {
    path: posix.join(config.outputDir, file.path),
    target: registryTarget(file.path, owner, config),
    type: file.kind === 'source' ? (sourceType ?? 'registry:component') : 'registry:file',
  };
}

function registryTarget(path: string, owner: string, config: SkinRegistryConfig): string {
  const sourcePrefix = `${config.sourceRoot}/`;
  if (!path.startsWith(sourcePrefix)) {
    throw new Error(`Registry source file \`${path}\` must be inside \`${config.sourceRoot}\`.`);
  }
  const relativePath = path.slice(sourcePrefix.length);
  if (relativePath === 'skin.tsx') return posix.join(config.installRoot, owner, relativePath);
  if (relativePath.startsWith('components/')) {
    return posix.join(config.installRoot, relativePath.replace(/^components\//, ''));
  }
  return posix.join(config.installRoot, relativePath);
}
