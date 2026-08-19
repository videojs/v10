import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { posix, relative, resolve, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { skinsPackageRoot } from '../../../build/catalog';
import { generateSkins } from '../../generate-skins';

const generatedRoots = [
  resolve(skinsPackageRoot, '../html/src/__generated__/skins'),
  resolve(skinsPackageRoot, '../react/src/__generated__/skins'),
  resolve(skinsPackageRoot, 'canonical/registry/default'),
] as const;
const registryManifest = resolve(skinsPackageRoot, 'canonical/registry/registry.json');
const workspaceRoot = resolve(skinsPackageRoot, '../..');

describe('generated skins', () => {
  beforeAll(async () => {
    await generateSkins();
  });

  it('matches the reviewed output', async () => {
    const paths = (await Promise.all(generatedRoots.map((root) => walkFiles(root)))).flat();
    paths.push(registryManifest);
    paths.sort();

    const output = await Promise.all(
      paths.map(async (path) => {
        const name = toPosixPath(relative(workspaceRoot, path));
        return `===== ${name} =====\n${await readFile(path, 'utf8')}`;
      })
    );

    expect(output.join('\n')).toMatchSnapshot();
  });
});

async function walkFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = resolve(currentDir, entry.name);
        return entry.isDirectory() ? walkFiles(rootDir, path) : [path];
      })
    )
  ).flat();
}

function toPosixPath(path: string): string {
  return path.split(sep).join(posix.sep);
}
