import { existsSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface ConfigFileModule {
  readonly default?: unknown;
  readonly config?: unknown;
}

export function findConfigFile(cwd: string, override: string | undefined, filenames: readonly string[]): string | null {
  if (override) {
    const path = isAbsolute(override) ? override : resolve(cwd, override);
    if (!existsSync(path)) throw new Error(`Config file not found: ${path}`);
    return path;
  }

  for (const filename of filenames) {
    const path = resolve(cwd, filename);
    if (existsSync(path)) return path;
  }

  return null;
}

export async function loadConfigExport(configPath: string): Promise<unknown> {
  const configUrl = pathToFileURL(configPath);
  configUrl.searchParams.set('mtime', String(statSync(configPath).mtimeMs));

  const module = (await import(configUrl.href)) as ConfigFileModule;
  return module.default ?? module.config;
}
