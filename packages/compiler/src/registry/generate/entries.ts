import { globSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import { isPlainObject } from '@videojs/utils/predicate';
import ts from 'typescript';
import type { ComponentDefinition, ComponentRecord, ComponentSchema } from '../../components/definition';
import { type GeneratedFileOptions, type GeneratedFileResult, writeGeneratedFile } from '../../generate';
import { resolveSourceModule, sourceScriptKind } from '../../utils/source-module';
import type { RegistryEntryReference } from '../definition';

export interface ResolvedEntry {
  readonly name: string;
  readonly entry: RegistryEntryReference;
  /** Prefer this entry when multiple source modules expose the same component. */
  readonly priority?: number | undefined;
}

export interface ResolvedSourceModule {
  readonly fileName: string;
  readonly sourceFile: ts.SourceFile;
}

export interface SourceEntryContext {
  readonly fileName: string;
  readonly sourceFile: ts.SourceFile;
  readonly resolveModule: (specifier: string) => ResolvedSourceModule | undefined;
}

export interface SchemaEntryContext {
  readonly component: string;
  readonly part: string | null;
}

export type SchemaEntryResolver = (context: SchemaEntryContext) => RegistryEntryReference | undefined;
export type SourceEntryResolver = (context: SourceEntryContext) => readonly ResolvedEntry[];

export interface GenerateSchemaEntriesConfig {
  readonly schema: ComponentSchema;
  readonly output: string;
  readonly resolve: SchemaEntryResolver;
  readonly files?: never;
}

export interface GenerateSourceEntriesConfig {
  readonly files: string | readonly string[];
  readonly output: string;
  readonly resolve: SourceEntryResolver;
  readonly schema?: never;
}

export type GenerateEntriesConfig = GenerateSchemaEntriesConfig | GenerateSourceEntriesConfig;
export type GenerateEntriesOptions = GeneratedFileOptions;
export type GenerateEntriesResult = GeneratedFileResult;

type EntryNode =
  | { readonly name: string; readonly entry: RegistryEntryReference }
  | { readonly name: string; readonly children: readonly EntryNode[] };

export function generateEntries(
  config: GenerateEntriesConfig,
  options: GenerateEntriesOptions = {}
): GenerateEntriesResult {
  const cwd = options.cwd ?? process.cwd();
  const nodes = isSchemaEntriesConfig(config) ? resolveSchemaEntries(config) : resolveSourceEntries(config, cwd);

  if (nodes.length === 0) throw new Error('No registry entries were generated.');

  const code = emitEntries(nodes);
  return writeGeneratedFile(config.output, code, options);
}

function isSchemaEntriesConfig(config: GenerateEntriesConfig): config is GenerateSchemaEntriesConfig {
  return config.schema !== undefined;
}

export function parseGenerateEntriesConfig(value: unknown, location: string): readonly GenerateEntriesConfig[] {
  const configs = Array.isArray(value) ? value : [value];

  for (const [index, config] of configs.entries()) {
    const configLocation = configs.length === 1 ? location : `${location}[${index}]`;
    validateConfig(config, configLocation);
  }

  return configs;
}

function resolveSchemaEntries(config: GenerateSchemaEntriesConfig): EntryNode[] {
  return Object.entries(config.schema.definitions)
    .map(([name, definition]) => resolveDefinition(name, definition, config.resolve))
    .sort(compareEntries);
}

function resolveDefinition(
  component: string,
  definition: ComponentDefinition<object, ComponentRecord | undefined>,
  resolveEntry: SchemaEntryResolver,
  part: string | null = null,
  name = component
): EntryNode {
  if (!definition.parts) {
    const entry = resolveEntry({ component, part });
    if (!entry) {
      throw new Error(`Entry resolver did not provide an implementation for <${component}${part ? `.${part}` : ''}>.`);
    }

    return { name, entry };
  }

  return {
    name,
    children: Object.entries(definition.parts)
      .map(([childName, child]) =>
        resolveDefinition(component, child, resolveEntry, part ? `${part}.${childName}` : childName, childName)
      )
      .sort(compareEntries),
  };
}

function resolveSourceEntries(config: GenerateSourceEntriesConfig, cwd: string): EntryNode[] {
  const patterns = typeof config.files === 'string' ? [config.files] : config.files;
  const sourceModules = new Map<string, ResolvedSourceModule>();
  const entries = patterns.flatMap((pattern) =>
    globSync(pattern, { cwd }).flatMap((path) => {
      const fileName = isAbsolute(path) ? path : resolve(cwd, path);
      const sourceFile = readSourceModule(fileName, sourceModules).sourceFile;

      return config.resolve({
        fileName,
        sourceFile,
        resolveModule(specifier) {
          const resolved = resolveSourceModule(fileName, specifier);
          return resolved ? readSourceModule(resolved, sourceModules) : undefined;
        },
      });
    })
  );
  const candidates = new Map<string, ResolvedEntry[]>();

  for (const entry of entries) {
    const matches = candidates.get(entry.name) ?? [];
    matches.push(entry);
    candidates.set(entry.name, matches);
  }

  const selected = [...candidates.values()].map((entries) => {
    const sorted = entries.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    if (sorted[1] && (sorted[0]!.priority ?? 0) === (sorted[1].priority ?? 0)) {
      throw new Error(`Duplicate component entry: ${sorted[0]!.name}`);
    }

    return sorted[0]!;
  });

  return selected.map(({ name, entry }) => ({ name, entry })).sort(compareEntries);
}

function readSourceModule(fileName: string, modules: Map<string, ResolvedSourceModule>): ResolvedSourceModule {
  const existing = modules.get(fileName);
  if (existing) return existing;

  const sourceModule = {
    fileName,
    sourceFile: ts.createSourceFile(
      fileName,
      readFileSync(fileName, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      sourceScriptKind(fileName)
    ),
  };

  modules.set(fileName, sourceModule);
  return sourceModule;
}

function emitEntries(nodes: readonly EntryNode[]): string {
  const declarations = nodes.map((node) => `export const ${node.name} = ${emitNode(node, 0)} as const;`).join('\n\n');
  const names = nodes.map((node) => `  ${node.name},`).join('\n');

  return `// Generated by \`vjsc generate\`.
${declarations}

export const entries = {
${names}
} as const;
`;
}

function emitNode(node: EntryNode, depth: number): string {
  if ('entry' in node) {
    return node.entry.tagName !== undefined ? emitElement(node.entry, depth) : emitModuleEntry(node.entry, depth);
  }

  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);
  const children = node.children
    .map((child) => `${childIndent}${child.name}: ${emitNode(child, depth + 1)},`)
    .join('\n');

  return `{\n${children}\n${indent}}`;
}

function emitElement(entry: Extract<RegistryEntryReference, { readonly tagName: string }>, depth: number): string {
  const properties: string[] = [];
  const indent = '  '.repeat(depth);
  const propertyIndent = '  '.repeat(depth + 1);
  const importIndent = '  '.repeat(depth + 2);

  properties.push(`${propertyIndent}tagName: ${quote(entry.tagName)},`);

  if (entry.import) {
    properties.push(
      `${propertyIndent}import: {`,
      `${importIndent}from: ${quote(entry.import.from)},`,
      `${importIndent}sideEffect: true,`,
      `${propertyIndent}},`
    );
  }

  properties.push(...emitMetadata(entry, depth));
  return `{\n${properties.join('\n')}\n${indent}}`;
}

function emitModuleEntry(
  entry: Extract<RegistryEntryReference, { readonly import: { readonly name: string } }>,
  depth: number
): string {
  const indent = '  '.repeat(depth);
  const propertyIndent = '  '.repeat(depth + 1);
  const importIndent = '  '.repeat(depth + 2);

  const properties = [
    `${propertyIndent}import: {`,
    `${importIndent}from: ${quote(entry.import.from)},`,
    `${importIndent}name: ${quote(entry.import.name)},`,
  ];

  if (entry.import.path?.length) {
    properties.push(`${importIndent}path: [${entry.import.path.map(quote).join(', ')}],`);
  }

  properties.push(`${propertyIndent}},`);
  properties.push(...emitMetadata(entry, depth));
  return `{\n${properties.join('\n')}\n${indent}}`;
}

function emitMetadata(entry: RegistryEntryReference, depth: number): string[] {
  const propertyIndent = '  '.repeat(depth + 1);
  const importIndent = '  '.repeat(depth + 2);
  const properties: string[] = [];

  if (entry.props) {
    properties.push(
      `${propertyIndent}props: {`,
      `${importIndent}from: ${quote(entry.props.from)},`,
      `${importIndent}name: ${quote(entry.props.name)},`
    );

    if (entry.props.path?.length) {
      properties.push(`${importIndent}path: [${entry.props.path.map(quote).join(', ')}],`);
    }

    if (entry.props.intrinsic) {
      properties.push(`${importIndent}intrinsic: ${quote(entry.props.intrinsic)},`);
    }

    if (entry.props.children) {
      properties.push(`${importIndent}children: ${quote(entry.props.children)},`);
    }

    properties.push(`${propertyIndent}},`);
  }

  return properties;
}

function compareEntries(a: EntryNode, b: EntryNode): number {
  return a.name.localeCompare(b.name);
}

function quote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function validateConfig(value: unknown, location: string): asserts value is GenerateEntriesConfig {
  if (!isPlainObject(value)) throw invalidConfig(location, 'expected an object');
  if (typeof value.output !== 'string' || value.output.length === 0) {
    throw invalidConfig(location, '`output` must be a non-empty string');
  }

  const schema = isPlainObject(value.schema);
  const files =
    typeof value.files === 'string' ||
    (Array.isArray(value.files) && value.files.length > 0 && value.files.every((file) => typeof file === 'string'));

  if (schema === files) {
    throw invalidConfig(location, 'expected either `schema` or `files`');
  }
  if (typeof value.resolve !== 'function') {
    throw invalidConfig(location, '`resolve` must be a function');
  }
}

function invalidConfig(location: string, message: string): Error {
  return new Error(`Invalid registry entries generator config ${location}: ${message}.`);
}
