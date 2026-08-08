import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePackageRegistry, skinsRoot } from '../../../skins/registry/index.ts';
import { generateReactRegistry } from './emit-react.ts';

export interface GenerateReactPackageRegistryOptions {
  check?: boolean | undefined;
}

export function generateReactPackageRegistry(options: GenerateReactPackageRegistryOptions = {}): Promise<void> {
  return generatePackageRegistry({
    framework: 'react',
    packageRoot: resolve(import.meta.dirname, '../..'),
    emit: (registry, style, itemNames) => generateReactRegistry(registry, { rootDir: skinsRoot, style, itemNames }),
    check: options.check,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateReactPackageRegistry({ check: process.argv.includes('--check') });
}
