import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { compile } from './compile';
import type { CompilerAsset, CompilerConfig, CompilerDiagnostic, CompilerInput } from './config';

export interface CompileProjectOptions {
  configDir?: string | undefined;
  cwd?: string | undefined;
}

export interface ProjectOutputFile {
  type: 'chunk' | 'asset';
  fileName: string;
  source: string;
}

export interface CompileProjectResult {
  files: readonly ProjectOutputFile[];
  diagnostics: readonly CompilerDiagnostic[];
}

interface ProjectEntry {
  name: string;
  inputFile: string;
  outputFile: string;
}

export async function compileProject(
  config: CompilerConfig,
  options: CompileProjectOptions = {}
): Promise<CompileProjectResult> {
  if (!config.input) {
    throw new Error('Compiler project config requires `input`.');
  }

  const configDir = options.configDir ?? options.cwd ?? process.cwd();
  const entries = normalizeEntries(
    config.input,
    configDir,
    config.output?.entryFileNames,
    config.output?.dir,
    config.output?.file
  );
  const files: ProjectOutputFile[] = [];
  const diagnostics: CompilerDiagnostic[] = [];

  for (const entry of entries) {
    const source = await readFile(entry.inputFile, 'utf8');
    const result = await compile(source, {
      filename: entry.inputFile,
      config,
      configDir,
      outputFile: entry.outputFile,
    });

    diagnostics.push(...result.diagnostics);
    files.push({
      type: 'chunk',
      fileName: entry.outputFile,
      source: `${config.output?.banner ?? ''}${result.code}`,
    });

    for (const asset of result.assets) {
      files.push(outputFromAsset(asset, entry.outputFile));
    }
  }

  return { files, diagnostics };
}

function normalizeEntries(
  input: CompilerInput,
  configDir: string,
  entryFileNames = '[name].js',
  outputDir = 'dist',
  outputFile: string | undefined
): ProjectEntry[] {
  const entries = inputEntries(input, configDir);
  if (outputFile && entries.length !== 1) {
    throw new Error('Compiler project config can only use `output.file` with one input entry.');
  }

  const seenOutputs = new Set<string>();
  return entries.map((entry) => {
    const file = outputFile
      ? resolveConfigPath(outputFile, configDir)
      : resolveConfigPath(join(outputDir, renderEntryFileName(entryFileNames, entry.name, entry.inputFile)), configDir);
    if (seenOutputs.has(file)) throw new Error(`Compiler project output collision: ${file}`);
    seenOutputs.add(file);
    return { ...entry, outputFile: file };
  });
}

function inputEntries(input: CompilerInput, configDir: string): Array<Omit<ProjectEntry, 'outputFile'>> {
  if (typeof input === 'string') {
    const inputFile = resolveConfigPath(input, configDir);
    return [{ name: entryNameFromPath(inputFile), inputFile }];
  }

  if (Array.isArray(input)) {
    const seen = new Set<string>();
    return input.map((file) => {
      const inputFile = resolveConfigPath(file, configDir);
      const name = entryNameFromPath(inputFile);
      if (seen.has(name)) throw new Error(`Compiler project input name collision: ${name}`);
      seen.add(name);
      return { name, inputFile };
    });
  }

  return Object.entries(input).map(([name, file]) => ({ name, inputFile: resolveConfigPath(file, configDir) }));
}

function outputFromAsset(asset: CompilerAsset, entryOutputFile: string): ProjectOutputFile {
  const fileName = isAbsolute(asset.fileName) ? asset.fileName : resolve(dirname(entryOutputFile), asset.fileName);
  return { type: 'asset', fileName, source: asset.source };
}

function resolveConfigPath(path: string, configDir: string): string {
  return isAbsolute(path) ? path : resolve(configDir, path);
}

function entryNameFromPath(path: string): string {
  const base = basename(path);
  const ext = extname(base);
  return ext ? base.slice(0, -ext.length) : base;
}

function renderEntryFileName(pattern: string, name: string, inputFile: string): string {
  const base = basename(inputFile);
  const ext = extname(base);
  return pattern
    .replaceAll('[name]', name)
    .replaceAll('[base]', base)
    .replaceAll('[ext]', ext.startsWith('.') ? ext.slice(1) : ext);
}
