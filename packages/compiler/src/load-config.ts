import { dirname } from 'node:path';

import { isPlainObject } from '@videojs/utils/predicate';
import { parseGenerateSchemaConfig } from './components/generate/schema';
import type { CompilerBuildConfig, CompilerConfig } from './config';
import { parseGenerateEntriesConfig } from './registry/generate/entries';
import { findConfigFile, loadConfigExport } from './utils/config-file';

export interface LoadedCompilerConfig {
  config: CompilerConfig;
  configPath: string;
  configDir: string;
}

export interface LoadedCompilerBuildConfig {
  config: CompilerBuildConfig;
  configPath: string;
  configDir: string;
}

export const CONFIG_FILENAMES = [
  'vjsc.config.js',
  'vjsc.config.mjs',
  'vjsc.config.ts',
  'vjsc.config.mts',
  'compiler.config.js',
  'compiler.config.mjs',
  'compiler.config.ts',
  'compiler.config.mts',
];

export function findConfig(cwd: string, override: string | undefined): string | null {
  return findConfigFile(cwd, override, CONFIG_FILENAMES);
}

export async function loadBuildConfigFile(configPath: string): Promise<LoadedCompilerBuildConfig> {
  const exported = await loadConfigExport(configPath);
  if (!exported) {
    throw new Error(`Config file ${configPath} must export a default compiler config (use \`defineConfig\`).`);
  }
  const config = parseBuildConfig(exported, configPath);
  return { config, configPath, configDir: dirname(configPath) };
}

export async function loadConfigFile(configPath: string): Promise<LoadedCompilerConfig> {
  const loaded = await loadBuildConfigFile(configPath);
  if (isCompilerConfigArray(loaded.config)) {
    throw new Error(`Config file ${configPath} must export a single compiler config.`);
  }
  return { ...loaded, config: loaded.config };
}

export async function loadBuildConfig(
  cwd: string,
  override: string | undefined
): Promise<LoadedCompilerBuildConfig | null> {
  const configPath = findConfig(cwd, override);
  return configPath ? loadBuildConfigFile(configPath) : null;
}

export async function loadConfig(cwd: string, override: string | undefined): Promise<LoadedCompilerConfig | null> {
  const configPath = findConfig(cwd, override);
  return configPath ? loadConfigFile(configPath) : null;
}

function isCompilerConfigArray(config: CompilerBuildConfig): config is readonly CompilerConfig[] {
  return Array.isArray(config);
}

function parseBuildConfig(value: unknown, configPath: string): CompilerBuildConfig {
  if (Array.isArray(value)) {
    value.forEach((config, index) => validateCompilerConfig(config, `${configPath}[${index}]`));
    return value as readonly CompilerConfig[];
  }
  validateCompilerConfig(value, configPath);
  return value as CompilerConfig;
}

function validateCompilerConfig(value: unknown, location: string): asserts value is CompilerConfig {
  if (!isPlainObject(value)) throw invalidConfig(location, 'expected an object');

  if (value.generate !== undefined) {
    if (!isPlainObject(value.generate)) throw invalidConfig(location, '`generate` must be an object');
    if (value.generate.schema !== undefined) {
      parseGenerateSchemaConfig(value.generate.schema, `${location}.generate.schema`);
    }
    if (value.generate.entries !== undefined) {
      parseGenerateEntriesConfig(value.generate.entries, `${location}.generate.entries`);
    }
  }

  if (value.input !== undefined && !isCompilerInput(value.input)) {
    throw invalidConfig(location, '`input` must be a string, string array, or string record');
  }

  if (
    value.external !== undefined &&
    typeof value.external !== 'function' &&
    (!Array.isArray(value.external) || value.external.some((item) => typeof item !== 'string'))
  ) {
    throw invalidConfig(location, '`external` must be a string array or function');
  }

  if (value.output !== undefined) {
    if (!isPlainObject(value.output)) throw invalidConfig(location, '`output` must be an object');
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
      if (!isPlainObject(plugin) || typeof plugin.name !== 'string' || plugin.name.length === 0) {
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
    if (!isPlainObject(value.target) || (value.target.name !== 'jsx' && value.target.name !== 'html')) {
      throw invalidConfig(location, '`target.name` must be "jsx" or "html"');
    }
    if (value.target.imports !== undefined) {
      if (!isPlainObject(value.target.imports)) throw invalidConfig(location, '`target.imports` must be an object');
      for (const [source, rule] of Object.entries(value.target.imports)) {
        if (rule !== false && typeof rule !== 'string' && typeof rule !== 'function') {
          throw invalidConfig(
            location,
            `import rule for ${JSON.stringify(source)} must be false, a string, or function`
          );
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
  return isPlainObject(value) && Object.values(value).every((item) => typeof item === 'string');
}

function invalidConfig(location: string, message: string): Error {
  return new Error(`Invalid compiler config ${location}: ${message}.`);
}
