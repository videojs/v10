#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { CompilerError, compile } from './compile';
import type { CompilerDiagnostic, CompilerProjectConfig } from './config';
import {
  type DiagnosticFormat,
  formatCompilerDiagnostic,
  formatCompilerDiagnosticJsonLine,
  formatDiagnosticSummaryJsonLine,
} from './diagnostics';
import { loadConfig, loadProjectConfig } from './load-config';
import { compileProject } from './project';

interface ParsedArgs {
  command: string | undefined;
  positional: string[];
  configOverride: string | undefined;
  outFile: string | undefined;
  diagnosticsFormat: DiagnosticFormat;
}

let currentDiagnosticsFormat: DiagnosticFormat = 'default';

function parseArgs(argv: readonly string[]): ParsedArgs {
  let command: string | undefined;
  let configOverride: string | undefined;
  let outFile: string | undefined;
  let diagnosticsFormat: DiagnosticFormat = 'default';
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--config' || arg === '-c') {
      configOverride = argv[++i];
    } else if (arg === '--out' || arg === '-o') {
      outFile = argv[++i];
    } else if (arg === '--diagnostics') {
      diagnosticsFormat = parseDiagnosticsFormat(argv[++i]);
    } else if (arg.startsWith('--diagnostics=')) {
      diagnosticsFormat = parseDiagnosticsFormat(arg.slice('--diagnostics='.length));
    } else if (!command && !arg.startsWith('-')) {
      command = arg;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }
  return { command, positional, configOverride, outFile, diagnosticsFormat };
}

function printHelp(): void {
  process.stdout.write(
    [
      'Usage: vjs <command> [options]',
      '',
      'Commands:',
      '  compile [file]        Compile a JSX file, or compile config.input when file is omitted',
      '',
      'Options:',
      '  -c, --config <path>   Path to a compiler config (default: compiler.config.ts in cwd)',
      '  -o, --out <path>      Write compiled code to a file (default: stdout)',
      '  --diagnostics <mode>  Diagnostic output: default or jsonl (default: default)',
      '  -h, --help            Show this help',
      '',
    ].join('\n')
  );
}

async function runCompile(
  positional: readonly string[],
  configOverride: string | undefined,
  outFile: string | undefined,
  diagnosticsFormat: DiagnosticFormat
): Promise<void> {
  const file = positional[0];
  const cwd = process.cwd();
  const outputPath = outFile ? (isAbsolute(outFile) ? outFile : resolve(cwd, outFile)) : undefined;

  if (!file) {
    const loaded = await loadProjectConfig(cwd, configOverride);
    if (!loaded || !hasProjectInput(loaded.config)) {
      throw new Error('Usage: vjs compile <file> or configure `input`.');
    }
    if (outputPath) throw new Error('`--out` is only supported when compiling a single file. Use `output` in config.');

    const result = await compileProject(loaded.config, { configDir: loaded.configDir, cwd });
    writeDiagnostics(result.diagnostics, diagnosticsFormat, { summary: diagnosticsFormat === 'jsonl' });

    for (const file of result.files) {
      mkdirSync(dirname(file.fileName), { recursive: true });
      writeFileSync(file.fileName, file.source, 'utf8');
      process.stdout.write(`Wrote ${file.fileName}\n`);
    }
    return;
  }

  const inputPath = isAbsolute(file) ? file : resolve(cwd, file);
  const source = readFileSync(inputPath, 'utf8');
  const loaded = await loadConfig(cwd, configOverride);
  const result = await compile(source, {
    filename: inputPath,
    config: loaded?.config,
    configDir: loaded?.configDir ?? cwd,
    ...(outputPath ? { outputFile: outputPath } : {}),
  });

  writeDiagnostics(result.diagnostics, diagnosticsFormat, { summary: diagnosticsFormat === 'jsonl' });

  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, result.code, 'utf8');
    process.stdout.write(`Wrote ${outputPath}\n`);
  } else {
    process.stdout.write(result.code);
  }

  const assetBase = outputPath ? dirname(outputPath) : cwd;
  for (const asset of result.assets) {
    const assetPath = isAbsolute(asset.fileName) ? asset.fileName : resolve(assetBase, asset.fileName);
    mkdirSync(dirname(assetPath), { recursive: true });
    writeFileSync(assetPath, asset.source, 'utf8');
    process.stdout.write(`Wrote ${assetPath}\n`);
  }
}

function hasProjectInput(config: CompilerProjectConfig): boolean {
  return Array.isArray(config) ? config.some((entry) => Boolean(entry.input)) : Boolean(config.input);
}

async function main(): Promise<void> {
  const { command, positional, configOverride, outFile, diagnosticsFormat } = parseArgs(process.argv.slice(2));
  currentDiagnosticsFormat = diagnosticsFormat;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  switch (command) {
    case 'compile':
      await runCompile(positional, configOverride, outFile, diagnosticsFormat);
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

function parseDiagnosticsFormat(value: string | undefined): DiagnosticFormat {
  if (value === 'default' || value === 'jsonl') return value;
  throw new Error(`Invalid diagnostics mode: ${value ?? '<missing>'}. Expected 'default' or 'jsonl'.`);
}

function writeDiagnostics(
  diagnostics: readonly CompilerDiagnostic[],
  format: DiagnosticFormat,
  options: { summary?: boolean | undefined } = {}
): void {
  if (format === 'jsonl') {
    for (const diagnostic of diagnostics) {
      process.stderr.write(formatCompilerDiagnosticJsonLine(diagnostic));
    }
    if (options.summary) process.stderr.write(formatDiagnosticSummaryJsonLine(diagnostics));
    return;
  }

  for (const diagnostic of diagnostics) {
    process.stderr.write(formatCompilerDiagnostic(diagnostic));
  }
}

function errorDiagnostic(error: unknown): CompilerDiagnostic {
  return {
    level: 'error',
    code: 'cli-error',
    message: error instanceof Error ? error.message : String(error),
    plugin: 'videojs/compiler',
  };
}

main().catch((error) => {
  if (error instanceof CompilerError) {
    writeDiagnostics(error.diagnostics, currentDiagnosticsFormat, { summary: currentDiagnosticsFormat === 'jsonl' });
    process.exit(1);
  }

  if (currentDiagnosticsFormat === 'jsonl') {
    writeDiagnostics([errorDiagnostic(error)], currentDiagnosticsFormat, { summary: true });
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  }
  process.exit(1);
});
