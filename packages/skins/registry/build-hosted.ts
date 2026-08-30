import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageDir = resolve(import.meta.dirname, '..');
const sourceDir = resolve(packageDir, 'dist/registry/source');
const hostedDir = resolve(packageDir, 'dist/registry/r');
const shadcnBin = resolve(packageDir, 'node_modules/shadcn/dist/index.js');
const catalogs = [
  [
    { source: 'r/react/registry.json', output: 'react' },
    { source: 'r/react/css/registry.json', output: 'react/css' },
  ],
  [
    { source: 'r/html/registry.json', output: 'html' },
    { source: 'r/html/css/registry.json', output: 'html/css' },
  ],
] as const;

await rm(hostedDir, { recursive: true, force: true });
await Promise.all(catalogs.map(buildCatalogs));

async function buildCatalogs(catalogs: (typeof catalogs)[number]): Promise<void> {
  for (const catalog of catalogs) {
    await runShadcn(['build', resolve(sourceDir, catalog.source), '--output', resolve(hostedDir, catalog.output)]);
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
