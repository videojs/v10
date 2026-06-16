#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { compile } from './compile';
import type { CompilerConfig } from './config';
import { generate } from './generate';

interface ConfigModule {
  default?: CompilerConfig;
  config?: CompilerConfig;
}

const CONFIG_FILENAMES = ['compiler.config.js', 'compiler.config.mjs', 'compiler.config.ts', 'compiler.config.mts'];

function findConfig(cwd: string, override: string | undefined): string {
  if (override) {
    const path = isAbsolute(override) ? override : resolve(cwd, override);
    if (!existsSync(path)) throw new Error(`Config file not found: ${path}`);
    return path;
  }
  for (const name of CONFIG_FILENAMES) {
    const path = resolve(cwd, name);
    if (existsSync(path)) return path;
  }
  throw new Error(
    `No compiler config found in ${cwd}. Expected one of: ${CONFIG_FILENAMES.join(', ')}, or pass --config <path>.`
  );
}

async function loadConfig(path: string): Promise<CompilerConfig> {
  const mod = (await import(pathToFileURL(path).href)) as ConfigModule;
  const config = mod.default ?? mod.config;
  if (!config) {
    throw new Error(`Config file ${path} must export a default \`CompilerConfig\` (use \`defineConfig\`).`);
  }
  return resolveConfigPaths(config, path);
}

function resolveConfigPaths(config: CompilerConfig, configPath: string): CompilerConfig {
  if (!config.generate) return config;
  const base = resolve(configPath, '..');
  const { output, components } = config.generate;
  return {
    ...config,
    generate: {
      components,
      output: isAbsolute(output) ? output : resolve(base, output),
    },
  };
}

interface ParsedArgs {
  command: string | undefined;
  positional: string[];
  configOverride: string | undefined;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let command: string | undefined;
  let configOverride: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--config' || arg === '-c') {
      configOverride = argv[++i];
    } else if (!command && !arg.startsWith('-')) {
      command = arg;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }
  return { command, positional, configOverride };
}

function printHelp(): void {
  process.stdout.write(
    [
      'Usage: vjs <command> [options]',
      '',
      'Commands:',
      '  generate              Generate components from the configured manifests',
      '  compile <file>        Compile a JSX file (stub)',
      '',
      'Options:',
      '  -c, --config <path>   Path to a compiler config (default: compiler.config.ts in cwd)',
      '  -h, --help            Show this help',
      '',
    ].join('\n')
  );
}

async function runGenerate(configOverride: string | undefined): Promise<void> {
  const cwd = process.cwd();
  const configPath = findConfig(cwd, configOverride);
  const config = await loadConfig(configPath);
  const result = await generate(config);
  process.stdout.write(`Wrote ${result.outputPath}\n`);
}

function runCompile(positional: readonly string[]): void {
  const file = positional[0];
  if (!file) throw new Error('Usage: vjs compile <file>');
  compile('', { filename: file, target: 'react' });
}

async function main(): Promise<void> {
  const { command, positional, configOverride } = parseArgs(process.argv.slice(2));
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  switch (command) {
    case 'generate':
      await runGenerate(configOverride);
      return;
    case 'compile':
      runCompile(positional);
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
