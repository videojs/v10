import { posix } from 'node:path';
import { createRegistry, type Registry, type RegistryFile, type RegistryFileType } from '@videojs/compiler/shadcn';
import type { SkinRegistryConfig } from '../../../canonical/registry/config';
import type { SkinCatalog } from '../../catalog';
import type { ShadcnSourceFile, ShadcnSourceOutput } from './source';

/** Create the shadcn manifest for the emitted React/Tailwind source. */
export function createShadcnManifest(
  catalog: SkinCatalog,
  output: ShadcnSourceOutput,
  config: SkinRegistryConfig
): Registry {
  const meta = { framework: config.framework, style: config.style, skin: config.skin } as const;
  return createRegistry(catalog, {
    name: config.name,
    homepage: config.homepage,
    namespace: config.namespace,
    items: {
      published: config.items,
      emitted: output.items,
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
      describe: (item) => ({
        type: item.type === 'skin' ? 'registry:block' : 'registry:component',
        title: item.title,
        description: item.description,
        meta,
      }),
    },
    resolve: {
      dependencies: ({ includedItems }) => [
        config.styleItem.name,
        ...(includedItems.some((item) => output.items[item.name]?.utilities) ? [config.utilityItem.name] : []),
      ],
      file: (file, owner) =>
        createRegistryFile(file, owner, config, owner === config.utilityItem.name ? 'registry:lib' : undefined),
    },
  });
}

function createRegistryFile(
  file: ShadcnSourceFile,
  owner: string,
  config: SkinRegistryConfig,
  sourceType?: RegistryFileType
): RegistryFile {
  return {
    path: posix.join(config.outputDir, file.path),
    target: resolveRegistryTarget(file.path, owner, config),
    type: file.kind === 'source' ? (sourceType ?? 'registry:component') : 'registry:file',
  };
}

function resolveRegistryTarget(path: string, owner: string, config: SkinRegistryConfig): string {
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
