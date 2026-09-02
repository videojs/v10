import { spawn } from 'node:child_process';
import { copyFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { registryTargets } from './targets.ts';

const packageDir = resolve(import.meta.dirname, '../..');
const sourceDir = resolve(packageDir, 'dist/registry/source');
const hostedDir = resolve(packageDir, 'dist/shadcn/r');
const shadcnBin = resolve(packageDir, 'node_modules/shadcn/dist/index.js');
const catalogs = Object.groupBy(registryTargets, ({ framework }) => framework);

await rm(hostedDir, { recursive: true, force: true });
await Promise.all(Object.values(catalogs).map((targets) => buildCatalogs(targets ?? [])));

async function buildCatalogs(targets: readonly (typeof registryTargets)[number][]): Promise<void> {
  for (const target of targets) {
    const output = target.output.replace(/^r\//, '');

    await runShadcn([
      'build',
      resolve(sourceDir, target.output, 'registry.json'),
      '--output',
      resolve(hostedDir, output),
    ]);
    await copyFile(resolve(sourceDir, target.output, 'catalog.json'), resolve(hostedDir, output, 'catalog.json'));
  }
}

async function runShadcn(args: readonly string[]): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(process.execPath, [shadcnBin, ...args], {
      cwd: packageDir,
      env: process.env,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`Shadcn registry build exited with ${signal ? `signal ${signal}` : `code ${code}`}.`));
    });
  });
}
