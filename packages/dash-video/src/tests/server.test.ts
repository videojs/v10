// @vitest-environment node
/// <reference types="node" />

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vite-plus/test';

const execFileAsync = promisify(execFile);

async function importPackageEntry(specifier: string, exportName: string) {
  const script = `const module = await import(${JSON.stringify(specifier)});
if (typeof module[${JSON.stringify(exportName)}] !== 'function') process.exit(1);`;

  await execFileAsync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: new URL('../../', import.meta.url),
  });
}

async function resolveBrowserPackageEntry(specifier: string) {
  const script = `console.log(import.meta.resolve(${JSON.stringify(specifier)}));`;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--conditions=browser', '--input-type=module', '--eval', script],
    { cwd: new URL('../../', import.meta.url) }
  );

  return stdout.trim();
}

describe('@videojs/dash-video server package imports', () => {
  it('imports the published entry without browser globals', async () => {
    await importPackageEntry('@videojs/dash-video', 'DashAdapter');
  });

  it('resolves the browser implementation in browser builds', async () => {
    const entry = await resolveBrowserPackageEntry('@videojs/dash-video');

    expect(entry).toMatch(/\/dist\/default\/index\.js$/);
  });
});
