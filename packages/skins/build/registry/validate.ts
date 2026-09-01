import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { isPlainObject, isString } from '@videojs/utils/predicate';
import { registryItemSchema, registrySchema, type RegistryItem } from 'shadcn/schema';

import { registryTargets } from './targets.ts';

const packageDir = resolve(import.meta.dirname, '../..');
const workspaceDir = resolve(packageDir, '../..');
const hostedDir = resolve(packageDir, 'dist/shadcn/r');
const catalogs = registryTargets.map((target) => target.output.replace(/^r\//, ''));

const versions = await workspacePackageVersions();
const items = (await Promise.all(catalogs.map(validateCatalog))).flat();

validatePackagePins(items, versions);

console.log(`Validated Video.js policy for ${items.length} hosted registry items.`);

async function validateCatalog(path: (typeof catalogs)[number]): Promise<RegistryItem[]> {
  const directory = resolve(hostedDir, path);
  const registry = registrySchema.parse(JSON.parse(await readFile(resolve(directory, 'registry.json'), 'utf8')));

  const files = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();

  const expected = ['registry.json', ...registry.items.map((item) => `${item.name}.json`)].sort();

  if (files.join('\n') !== expected.join('\n')) {
    throw new Error(
      `Hosted ${path} files do not match its catalog. Expected ${expected.length}; received ${files.length}.`
    );
  }

  return Promise.all(
    registry.items.map(async ({ name }) => {
      const source = await readFile(resolve(directory, `${name}.json`), 'utf8');

      return registryItemSchema.parse(JSON.parse(source));
    })
  );
}

function validatePackagePins(items: readonly RegistryItem[], versions: ReadonlyMap<string, string>): void {
  for (const item of items) {
    for (const dependency of item.dependencies ?? []) {
      if (!dependency.startsWith('@videojs/')) continue;

      const separator = dependency.lastIndexOf('@');
      const name = dependency.slice(0, separator);
      const version = dependency.slice(separator + 1);
      const expected = versions.get(name);

      if (separator <= 0 || !expected || version !== expected) {
        throw new Error(
          `${item.name} must pin ${name || dependency} to its workspace artifact (${expected ?? 'unknown package'}).`
        );
      }
    }
  }
}

async function workspacePackageVersions(): Promise<ReadonlyMap<string, string>> {
  const packagesDir = resolve(workspaceDir, 'packages');
  const entries = await readdir(packagesDir, { withFileTypes: true });

  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const source = await readFile(resolve(packagesDir, entry.name, 'package.json'), 'utf8').catch(() => undefined);
        if (!source) return undefined;

        const manifest = JSON.parse(source);
        if (!isPlainObject(manifest) || !isString(manifest.name) || !isString(manifest.version)) return undefined;

        return [manifest.name, manifest.version] as const;
      })
  );

  return new Map(manifests.filter((entry) => entry !== undefined));
}
