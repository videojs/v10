import type { Dirent } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

import { createLogger, createServer, type Plugin, type ViteDevServer } from 'vite';
import { afterEach, describe, it, vi } from 'vite-plus/test';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'dev/vite.config.ts');
const sourceDir = resolve(packageDir, 'vjsc');
const snapshotFile = resolve(import.meta.dirname, '__snapshots__/generated.tsx.snap');
const targets = ['react', 'html'] as const;
const skins = ['default-video', 'minimal-video'] as const;
const styles = ['css', 'tailwind'] as const;

interface GeneratedModule {
  readonly key: string;
  readonly request: string;
}

describe('generated VJSC source', () => {
  let server: ViteDevServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  }, 30_000);

  it('matches every transformed component and skin variant', async ({ expect }) => {
    const sources = await sourceModules();
    const modules = generatedModules(sources);
    const sourceNames = new Map(sources.map((filename) => [filename, sourceName(filename)]));
    const transformed = new Map<string, string>();
    const logger = createLogger('silent');
    const warn = vi.spyOn(logger, 'warn');
    const warnOnce = vi.spyOn(logger, 'warnOnce');
    const capture: Plugin = {
      name: 'test:capture-generated-vjsc-source',
      enforce: 'pre',
      transform(code, id) {
        const key = generatedKey(id, sourceNames);

        if (key) transformed.set(key, normalizeGeneratedSource(code));

        return null;
      },
    };

    server = await createServer({
      configFile,
      customLogger: logger,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      plugins: [capture],
      server: { middlewareMode: true },
    });

    await Promise.all(
      modules.map(async (module) => {
        const result = await server!.transformRequest(module.request);

        expect(result, module.key).not.toBeNull();
      })
    );

    expect(transformed.size).toBe(modules.length);
    expect([...warn.mock.calls, ...warnOnce.mock.calls].flat().join('\n')).not.toContain('emitFile() is not supported');

    const output = modules
      .map((module) => {
        const code = transformed.get(module.key);
        if (!code) throw new Error(`VJSC did not transform \`${module.key}\`.`);

        return `// ===== ${module.key} =====\n${code.trim()}\n`;
      })
      .join('\n');

    expect(output).not.toContain('_jsxDEV');
    expect(output).not.toContain('/@fs/');
    expect(output).not.toMatch(/from ["']@videojs\/core\/vjsc["']/);

    const snapshot = await readFile(snapshotFile, 'utf8');

    expect(output).toBe(snapshot);
  }, 60_000);
});

async function sourceModules(): Promise<string[]> {
  return (await Promise.all([walkFiles(resolve(sourceDir, 'components')), walkFiles(resolve(sourceDir, 'skins'))]))
    .flat()
    .filter((filename) => filename.endsWith('.tsx'))
    .sort((left, right) => sourceName(left).localeCompare(sourceName(right)));
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  return (
    await Promise.all(
      entries.map((entry: Dirent) => {
        const path = resolve(directory, entry.name);

        return entry.isDirectory() ? walkFiles(path) : [path];
      })
    )
  ).flat();
}

function generatedModules(sources: readonly string[]): GeneratedModule[] {
  const modules: GeneratedModule[] = [];

  for (const target of targets) {
    for (const skin of skins) {
      for (const style of styles) {
        for (const filename of sources) {
          const name = sourceName(filename);
          const ownedSkin = /^skins\/([^/]+)\//.exec(name)?.[1];
          if (ownedSkin && ownedSkin !== skin) continue;

          const parameters = new URLSearchParams({ target, skin, style });
          const key = `${target}/${skin}/${style}/${name}`;

          modules.push({ key, request: `/@fs${filename}?${parameters}` });
        }
      }
    }
  }

  return modules;
}

function generatedKey(id: string, sourceNames: ReadonlyMap<string, string>): string | undefined {
  const queryIndex = id.indexOf('?');
  if (queryIndex < 0) return undefined;

  const name = sourceNames.get(id.slice(0, queryIndex));
  if (!name) return undefined;

  const parameters = new URLSearchParams(id.slice(queryIndex + 1));
  const target = parameters.get('target');
  const skin = parameters.get('skin');
  const style = parameters.get('style');

  return target && skin && style ? `${target}/${skin}/${style}/${name}` : undefined;
}

function normalizeGeneratedSource(code: string): string {
  return code
    .replaceAll('\r\n', '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/virtual:vjsc\/css\/[a-f0-9]{12}\//g, 'virtual:vjsc/css/<hash>/')
    .replace(/__vjsc-id-[A-Za-z0-9_-]{8}-/g, '__vjsc-id-<module>-')
    .replace(/(<Scope prefix=")[A-Za-z0-9_-]{8}-/g, '$1<module>-');
}

function sourceName(filename: string): string {
  return relative(sourceDir, filename).split(sep).join('/');
}
