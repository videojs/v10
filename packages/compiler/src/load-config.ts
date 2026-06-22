import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { CompilerConfig } from './config';

interface ConfigModule {
  default?: CompilerConfig;
  config?: CompilerConfig;
}

export interface LoadedCompilerConfig {
  config: CompilerConfig;
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

export async function loadConfigFile(configPath: string): Promise<LoadedCompilerConfig> {
  const mod = (await import(pathToFileURL(configPath).href)) as ConfigModule;
  const config = mod.default ?? mod.config;
  if (!config) {
    throw new Error(`Config file ${configPath} must export a default compiler config (use \`defineConfig\`).`);
  }
  return { config: resolveConfigPaths(config, configPath), configPath, configDir: dirname(configPath) };
}

export async function loadConfig(cwd: string, override: string | undefined): Promise<LoadedCompilerConfig | null> {
  const configPath = findConfig(cwd, override);
  return configPath ? loadConfigFile(configPath) : null;
}

function resolveConfigPaths(config: CompilerConfig, configPath: string): CompilerConfig {
  if (!config.generate) return config;
  const base = dirname(configPath);
  const { output, components } = config.generate;
  return {
    ...config,
    generate: {
      components,
      output: isAbsolute(output) ? output : resolve(base, output),
    },
  };
}
