import type { FullConfig } from '@playwright/test';

/** Dynamic skin imports as Vite rewrites them inside the served playground loader. */
const SKIN_MODULE = /import\("([^"]+\/skin\.tsx\?[^"]+)"\)/g;
/** Dynamic imports in the served playground entry: the framework players and the Tailwind stylesheet. */
const ENTRY_MODULE = /import\("([^"]+)"\)/g;
const CONCURRENCY = 4;

/**
 * Compile every authored skin, framework player, and the Tailwind entry before the first case runs. Cold VJSC and
 * Tailwind transforms otherwise land inside test timeouts, and parallel workers would race the same compilations. The
 * URLs come from the served modules, so the warm-up follows whatever Vite rewrites the imports to.
 */
export default async function setup(config: FullConfig): Promise<void> {
  const baseURL = config.projects.find((project) => project.use.baseURL)?.use.baseURL;
  if (!baseURL) throw new Error('Skin parity needs a project `baseURL` to warm the playground.');

  const started = performance.now();
  const [loaders, entry] = await Promise.all([fetchText(baseURL, '/loaders.ts'), fetchText(baseURL, '/main.tsx')]);
  const skins = [...loaders.matchAll(SKIN_MODULE)].map((match) => match[1]!);
  const entries = [...entry.matchAll(ENTRY_MODULE)].map((match) => match[1]!);
  // Vite appends cache-busting queries after hot updates, so classify each URL by its path.
  const isStylesheet = (url: string) => new URL(url, baseURL).pathname.endsWith('.css');
  const stylesheets = entries.filter(isStylesheet);
  const players = entries.filter((url) => !isStylesheet(url));

  if (skins.length === 0 || stylesheets.length === 0) throw new Error('Could not find the playground modules to warm.');

  await inBatches([...skins, ...players], async (url) => {
    await fetchText(baseURL, url);
  });
  // Tailwind compiles against the candidates every skin module recorded above, so it goes last.
  await inBatches(stylesheets, async (url) => {
    await fetchText(baseURL, url);
  });

  const seconds = ((performance.now() - started) / 1000).toFixed(1);

  console.log(`Warmed ${skins.length} skin modules, ${players.length} players, and Tailwind in ${seconds}s.`);
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
