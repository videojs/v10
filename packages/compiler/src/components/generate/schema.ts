import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, resolve } from 'node:path';

import { isPlainObject } from '@videojs/utils/predicate';
import ts from 'typescript';

import { type GeneratedFileOptions, type GeneratedFileResult, writeGeneratedFile } from '../../generate';
import { toPosixPath } from '../../utils/path';
import { relativeModuleSpecifier, sourceScriptKind } from '../../utils/source-module';

export interface ComponentFileSet {
  readonly files: string;
  readonly name: (filename: string) => string;
}

export type ComponentSource = string | ComponentFileSet;

export interface GenerateSchemaConfig {
  /** Module specifier canonical source files use to import the generated components. */
  readonly source: string;
  readonly files: readonly ComponentSource[];
  readonly output: string;
}

export type GenerateSchemaOptions = GeneratedFileOptions;
export type GenerateSchemaResult = GeneratedFileResult;

interface ManifestComponent {
  readonly kind: 'manifest';
  readonly name: string;
  readonly manifestFrom: string;
}

interface InlineComponent {
  readonly kind: 'inline';
  readonly name: string;
}

type ResolvedComponent = ManifestComponent | InlineComponent;

export function generateSchema(
  config: GenerateSchemaConfig,
  options: GenerateSchemaOptions = {}
): GenerateSchemaResult {
  const { files, output, source } = config;
  const cwd = options.cwd ?? process.cwd();
  const outputAbsolute = isAbsolute(output) ? output : resolve(cwd, output);

  const resolved = files.flatMap<ResolvedComponent>((entry) =>
    typeof entry === 'string' ? resolveManifestEntry(entry, cwd, outputAbsolute) : resolveFileSet(entry, cwd)
  );
  const entries = resolved.sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) {
    throw new Error(`No component sources matched: ${JSON.stringify(files)}`);
  }

  const duplicate = entries.find((entry, index) => entry.name === entries[index - 1]?.name);
  if (duplicate) throw new Error(`Duplicate component name: ${duplicate.name}`);

  const generated = `${[emitHeader(entries), emitComponents(entries), emitMetadata(entries, source)].join('\n\n')}\n`;
  return writeGeneratedFile(outputAbsolute, generated, options);
}

export function parseGenerateSchemaConfig(value: unknown, location: string): readonly GenerateSchemaConfig[] {
  const configs = Array.isArray(value) ? value : [value];

  for (const [index, config] of configs.entries()) {
    const configLocation = configs.length === 1 ? location : `${location}[${index}]`;
    validateConfig(config, configLocation);
  }

  return configs;
}

function isDefineComponentCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineComponent';
}

function findDefaultExportCall(sourceFile: ts.SourceFile): ts.CallExpression | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isExportAssignment(statement) || statement.isExportEquals) continue;
    if (isDefineComponentCall(statement.expression)) return statement.expression;
  }

  return null;
}

function parseComponentName(manifestPath: string): string {
  const sourceText = readFileSync(manifestPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    manifestPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourceScriptKind(manifestPath)
  );
  const call = findDefaultExportCall(sourceFile);

  if (!call) {
    throw new Error(`No \`export default defineComponent(...)\` found in ${manifestPath}`);
  }

  const argument = call.arguments[0];
  if (!argument || !ts.isObjectLiteralExpression(argument)) {
    throw new Error(`defineComponent() in ${manifestPath} must take an object literal`);
  }

  for (const property of argument.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'name' &&
      ts.isStringLiteral(property.initializer)
    ) {
      return property.initializer.text;
    }
  }

  throw new Error(`defineComponent() in ${manifestPath} is missing a literal \`name:\` field`);
}

function resolveManifestEntry(pattern: string, cwd: string, outputFile: string): ManifestComponent[] {
  return globSync(pattern, { cwd }).map((path) => {
    const manifestPath = isAbsolute(path) ? path : resolve(cwd, path);

    return {
      kind: 'manifest',
      name: parseComponentName(manifestPath),
      manifestFrom: relativeModuleSpecifier(toPosixPath(dirname(outputFile)), toPosixPath(manifestPath)),
    };
  });
}

function resolveFileSet(entry: ComponentFileSet, cwd: string): InlineComponent[] {
  return globSync(entry.files, { cwd }).map((file) => ({
    kind: 'inline',
    name: entry.name(fileStem(file)),
  }));
}

function fileStem(filePath: string): string {
  const filename = basename(filePath);
  const extension = extname(filename);
  return extension ? filename.slice(0, -extension.length) : filename;
}

function compareImportSpecifiers(a: string, b: string): number {
  return a.replaceAll('/', ' ').localeCompare(b.replaceAll('/', ' '));
}

function emitHeader(entries: readonly ResolvedComponent[]): string {
  const manifestLines = entries
    .filter((entry): entry is ManifestComponent => entry.kind === 'manifest')
    .sort((a, b) => compareImportSpecifiers(a.manifestFrom, b.manifestFrom))
    .map((entry) => `import ${entry.name}Def from '${entry.manifestFrom}';`)
    .join('\n');
  const header = `// Generated by \`vjsc generate\`.
import { createComponent, defineSchema } from 'vjsc/components';`;

  return manifestLines ? `${header}\n\n${manifestLines}` : header;
}

function manifestRef(entry: ResolvedComponent): string {
  return entry.kind === 'manifest' ? `${entry.name}Def` : `{ name: '${entry.name}' }`;
}

function emitComponents(entries: readonly ResolvedComponent[]): string {
  return entries.map((entry) => `export const ${entry.name} = createComponent(${manifestRef(entry)});`).join('\n');
}

function emitMetadata(entries: readonly ResolvedComponent[], source: string): string {
  const lines = entries.map((entry) => `  ${entry.name}: ${manifestRef(entry)},`);

  return `const DEFINITIONS = {\n${lines.join('\n')}\n} as const;

export const schema = defineSchema('${source}', DEFINITIONS);`;
}

function validateConfig(value: unknown, location: string): asserts value is GenerateSchemaConfig {
  if (!isPlainObject(value)) throw invalidConfig(location, 'expected an object');
  if (typeof value.source !== 'string' || value.source.length === 0) {
    throw invalidConfig(location, '`source` must be a non-empty string');
  }
  if (typeof value.output !== 'string' || value.output.length === 0) {
    throw invalidConfig(location, '`output` must be a non-empty string');
  }
  if (!Array.isArray(value.files) || value.files.length === 0) {
    throw invalidConfig(location, '`files` must be a non-empty array');
  }

  for (const [index, component] of value.files.entries()) {
    if (typeof component === 'string') continue;
    if (!isPlainObject(component) || typeof component.files !== 'string' || typeof component.name !== 'function') {
      throw invalidConfig(location, `\`files[${index}]\` must be a glob or file set`);
    }
  }
}

function invalidConfig(location: string, message: string): Error {
  return new Error(`Invalid component schema generator config ${location}: ${message}.`);
}
