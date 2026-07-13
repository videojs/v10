import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { CompilerConfig, CompilerProjectConfig } from './config';

interface ConfigModule {
  default?: CompilerProjectConfig;
  config?: CompilerProjectConfig;
}

export interface LoadedCompilerConfig {
  config: CompilerConfig;
  configPath: string;
  configDir: string;
}

export interface LoadedCompilerProjectConfig {
  config: CompilerProjectConfig;
  configPath: string;
  configDir: string;
}

export const CONFIG_FILENAMES = [
  'compiler.config.js',
  'compiler.config.mjs',
  'compiler.config.ts',
  'compiler.config.mts',
];

export function findConfig(cwd: string, override: string | undefined): string | null {
  if (override) {
    const path = isAbsolute(override) ? override : resolve(cwd, override);
    if (!existsSync(path)) throw new Error(`Config file not found: ${path}`);
    return path;
  }

  for (const name of CONFIG_FILENAMES) {
    const path = resolve(cwd, name);
    if (existsSync(path)) return path;
  }

  return null;
}

export async function loadProjectConfigFile(configPath: string): Promise<LoadedCompilerProjectConfig> {
  const mod = (await import(pathToFileURL(configPath).href)) as ConfigModule;
  const config = mod.default ?? mod.config;
  if (!config) {
    throw new Error(`Config file ${configPath} must export a default compiler config (use \`defineConfig\`).`);
  }
  return { config, configPath, configDir: dirname(configPath) };
}

export async function loadConfigFile(configPath: string): Promise<LoadedCompilerConfig> {
  const loaded = await loadProjectConfigFile(configPath);
  if (Array.isArray(loaded.config)) {
    throw new Error(`Config file ${configPath} must export a single compiler config.`);
  }
  return { ...loaded, config: loaded.config };
}

export async function loadProjectConfig(
  cwd: string,
  override: string | undefined
): Promise<LoadedCompilerProjectConfig | null> {
  const configPath = findConfig(cwd, override);
  return configPath ? loadProjectConfigFile(configPath) : null;
}

export async function loadConfig(cwd: string, override: string | undefined): Promise<LoadedCompilerConfig | null> {
  const configPath = findConfig(cwd, override);
  return configPath ? loadConfigFile(configPath) : null;
}
