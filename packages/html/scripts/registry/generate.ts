import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePackageRegistry, skinsRoot } from '../../../skins/registry/index.ts';
import { generateHtmlRegistry } from './emit-html.ts';

export interface GenerateHtmlPackageRegistryOptions {
  check?: boolean | undefined;
}

export function generateHtmlPackageRegistry(options: GenerateHtmlPackageRegistryOptions = {}): Promise<void> {
  return generatePackageRegistry({
    framework: 'html',
    packageRoot: resolve(import.meta.dirname, '../..'),
    emit: (registry, style, itemNames) => generateHtmlRegistry(registry, { rootDir: skinsRoot, style, itemNames }),
    check: options.check,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateHtmlPackageRegistry({ check: process.argv.includes('--check') });
}
