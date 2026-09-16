import { resolve } from 'node:path';

import type { FullConfig } from '@playwright/test';

/** Dynamic skin imports as Vite rewrites them inside the served authored-skin loaders. */
const SKIN_MODULE = /import\("([^"]+\/skin\.tsx\?[^"]+)"\)/g;
const CONCURRENCY = 4;
const workspaceDir = resolve(import.meta.dirname, '../../../../..');
const sandboxAppDir = resolve(workspaceDir, 'apps/sandbox/app');
/** The template pages the parity cases open, one per player. */
const TEMPLATE_ENTRIES = [
  '/html-video/main.ts',
  '/react-video/main.tsx',
  '/html-mux-video/main.ts',
  '/react-mux-video/main.tsx',
  '/html-audio/main.ts',
  '/react-audio/main.tsx',
  '/html-mux-audio/main.ts',
  '/react-mux-audio/main.tsx',
];

/**
 * Compile every authored skin, the template entries, and the authored Tailwind entry before the first case runs. Cold
 * VJSC and Tailwind transforms otherwise land inside test timeouts, and parallel workers would race the same
 * compilations. The skin URLs come from the served loader module, so the warm-up follows whatever Vite rewrites the
 * imports to.
 */
export default async function setup(config: FullConfig): Promise<void> {
  const baseURL = config.projects.find((project) => project.use.baseURL)?.use.baseURL;
  if (!baseURL) throw new Error('Skin parity needs a project `baseURL` to warm the sandbox.');

  const started = performance.now();
  const loaders = await fetchText(baseURL, `/@fs${resolve(sandboxAppDir, 'shared/authored-skins.ts')}`);
  const skins = [...loaders.matchAll(SKIN_MODULE)].map((match) => match[1]!);
  if (skins.length === 0) throw new Error('Could not find the authored skin modules to warm.');

  await inBatches([...skins, ...TEMPLATE_ENTRIES], async (url) => {
    await fetchText(baseURL, url);
  });
  // Tailwind compiles against the candidates every skin module recorded above, so it goes last.
  await fetchText(baseURL, `/@fs${resolve(sandboxAppDir, 'styles.authored.css')}`);

  const seconds = ((performance.now() - started) / 1000).toFixed(1);

  console.log(
    `Warmed ${skins.length} skin modules, ${TEMPLATE_ENTRIES.length} templates, and Tailwind in ${seconds}s.`
  );
}

async function fetchText(baseURL: string, path: string): Promise<string> {
  const response = await fetch(new URL(path, baseURL));
  if (!response.ok) throw new Error(`Warming ${path} failed with ${response.status}.`);

  return response.text();
}

async function inBatches<T>(items: readonly T[], run: (item: T) => Promise<void>): Promise<void> {
  const pending = [...items];

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      for (let item = pending.shift(); item !== undefined; item = pending.shift()) await run(item);
    })
  );
}
