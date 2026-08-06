import { existsSync, statSync } from 'node:fs';
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
  const configUrl = pathToFileURL(configPath);
  configUrl.searchParams.set('mtime', String(statSync(configPath).mtimeMs));
  const mod = (await import(configUrl.href)) as ConfigModule;
  const exported = mod.default ?? mod.config;
  if (!exported) {
    throw new Error(`Config file ${configPath} must export a default compiler config (use \`defineConfig\`).`);
  }
  const config = parseProjectConfig(exported, configPath);
  return { config, configPath, configDir: dirname(configPath) };
}

export async function loadConfigFile(configPath: string): Promise<LoadedCompilerConfig> {
  const loaded = await loadProjectConfigFile(configPath);
  if (isCompilerConfigArray(loaded.config)) {
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

function isCompilerConfigArray(config: CompilerProjectConfig): config is readonly CompilerConfig[] {
  return Array.isArray(config);
}

function parseProjectConfig(value: unknown, configPath: string): CompilerProjectConfig {
  if (Array.isArray(value)) {
    value.forEach((config, index) => validateCompilerConfig(config, `${configPath}[${index}]`));
    return value as readonly CompilerConfig[];
  }
  validateCompilerConfig(value, configPath);
  return value as CompilerConfig;
}

function validateCompilerConfig(value: unknown, location: string): asserts value is CompilerConfig {
  if (!isRecord(value)) throw invalidConfig(location, 'expected an object');

  if (value.input !== undefined && !isCompilerInput(value.input)) {
    throw invalidConfig(location, '`input` must be a string, string array, or string record');
  }

  if (value.output !== undefined) {
    if (!isRecord(value.output)) throw invalidConfig(location, '`output` must be an object');
    for (const key of ['dir', 'file', 'entryFileNames', 'banner'] as const) {
      if (value.output[key] !== undefined && typeof value.output[key] !== 'string') {
        throw invalidConfig(location, `\`output.${key}\` must be a string`);
      }
    }
    if (value.output.dir !== undefined && value.output.file !== undefined) {
      throw invalidConfig(location, '`output.dir` and `output.file` cannot be used together');
    }
  }

  if (value.plugins !== undefined) {
    if (!Array.isArray(value.plugins)) throw invalidConfig(location, '`plugins` must be an array');
    value.plugins.forEach((plugin, index) => {
      if (!isRecord(plugin) || typeof plugin.name !== 'string' || plugin.name.length === 0) {
        throw invalidConfig(location, `\`plugins[${index}]\` must have a non-empty string name`);
      }
      if (plugin.enforce !== undefined && plugin.enforce !== 'pre' && plugin.enforce !== 'post') {
        throw invalidConfig(location, `\`plugins[${index}].enforce\` must be "pre" or "post"`);
      }
      if (plugin.setup !== undefined && typeof plugin.setup !== 'function') {
        throw invalidConfig(location, `\`plugins[${index}].setup\` must be a function`);
      }
    });
  }

  if (value.target !== undefined) {
    if (!isRecord(value.target) || value.target.name !== 'jsx') {
      throw invalidConfig(location, '`target.name` must be "jsx"');
    }
    if (value.target.imports !== undefined) {
      if (!isRecord(value.target.imports)) throw invalidConfig(location, '`target.imports` must be an object');
      for (const [source, rule] of Object.entries(value.target.imports)) {
        if (typeof rule !== 'string' && typeof rule !== 'function') {
          throw invalidConfig(location, `import rule for ${JSON.stringify(source)} must be a string or function`);
        }
      }
    }
    if (
      value.target.transforms !== undefined &&
      (!Array.isArray(value.target.transforms) || value.target.transforms.some((item) => typeof item !== 'function'))
    ) {
      throw invalidConfig(location, '`target.transforms` must be an array of functions');
    }
  }
}

function isCompilerInput(value: unknown): boolean {
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) return value.every((item) => typeof item === 'string');
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidConfig(location: string, message: string): Error {
  return new Error(`Invalid compiler config ${location}: ${message}.`);
}
