import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, resolve } from 'node:path';

import ts from 'typescript';
import { toPosixPath } from '../../ts/utils/path';
import { relativeModuleSpecifier, sourceScriptKind } from '../../ts/utils/source-module';
import { type ComponentDefinition, type ComponentRecord, type ComponentSchema, defineSchema } from '../definition';

export interface ComponentFileSet {
  readonly include: string;
  readonly exclude?: string | readonly string[] | undefined;
  readonly name: (filename: string) => string;
}

export type ComponentSource = string | ComponentFileSet;

export interface CreateSchemaModuleOptions {
  /** Base directory used to resolve relative paths. */
  readonly cwd?: string | undefined;
  /** Module specifier source files use to import the generated components. */
  readonly source: string;
  readonly include: readonly ComponentSource[];
  readonly exclude?: string | readonly string[] | undefined;
  readonly output: string;
}
export interface SchemaModule {
  readonly code: string;
  readonly watchFiles: readonly string[];
  readonly schema: ComponentSchema;
}

interface ManifestComponent {
  readonly kind: 'manifest';
  readonly name: string;
  readonly manifestFrom: string;
  readonly definition: ComponentDefinition<object, ComponentRecord | undefined>;
}

interface InlineComponent {
  readonly kind: 'inline';
  readonly name: string;
  readonly definition: ComponentDefinition<object, undefined>;
}

type ResolvedComponent = ManifestComponent | InlineComponent;

/** Produce a component schema module without writing it to disk. */
export function createSchemaModule(options: CreateSchemaModuleOptions): SchemaModule {
  const { cwd = process.cwd(), exclude, include, output, source } = options;
  const outputAbsolute = isAbsolute(output) ? output : resolve(cwd, output);
  const watchFiles = new Set<string>();

  const resolved = include.flatMap<ResolvedComponent>((entry) =>
    typeof entry === 'string'
      ? resolveManifestEntry(entry, exclude, cwd, outputAbsolute, watchFiles)
      : resolveFileSet(entry, cwd, watchFiles)
  );
  const entries = resolved.sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) {
    throw new Error(`No component sources matched: ${JSON.stringify(include)}`);
  }

  const duplicate = entries.find((entry, index) => entry.name === entries[index - 1]?.name);
  if (duplicate) throw new Error(`Duplicate component name: ${duplicate.name}`);

  const generated = `${[emitHeader(entries), emitComponents(entries), emitMetadata(entries, source)].join('\n\n')}\n`;

  return {
    code: generated,
    schema: defineSchema(source, Object.fromEntries(entries.map((entry) => [entry.name, entry.definition]))),
    watchFiles: [...watchFiles].sort(),
  };
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

function parseComponentManifest(manifestPath: string): {
  name: string;
  definition: ComponentDefinition<object, ComponentRecord | undefined>;
} {
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

  const definition = parseComponentDefinition(call, manifestPath);
  if (!definition.name) throw new Error(`defineComponent() in ${manifestPath} is missing a literal \`name:\` field`);
  return { name: definition.name, definition };
}

function resolveManifestEntry(
  pattern: string,
  exclude: string | readonly string[] | undefined,
  cwd: string,
  outputFile: string,
  watchFiles: Set<string>
): ManifestComponent[] {
  const excluded = typeof exclude === 'string' ? [exclude] : exclude;
  return globSync(pattern, { cwd, ...(excluded ? { exclude: excluded } : {}) }).map((path) => {
    const manifestPath = isAbsolute(path) ? path : resolve(cwd, path);
    const manifest = parseComponentManifest(manifestPath);
    watchFiles.add(manifestPath);

    return {
      kind: 'manifest',
      ...manifest,
      manifestFrom: relativeModuleSpecifier(toPosixPath(dirname(outputFile)), toPosixPath(manifestPath)),
    };
  });
}

function resolveFileSet(entry: ComponentFileSet, cwd: string, watchFiles: Set<string>): InlineComponent[] {
  const exclude = typeof entry.exclude === 'string' ? [entry.exclude] : entry.exclude;
  return globSync(entry.include, { cwd, ...(exclude ? { exclude } : {}) }).map((file) => {
    watchFiles.add(isAbsolute(file) ? file : resolve(cwd, file));
    return {
      kind: 'inline',
      name: entry.name(fileStem(file)),
      definition: { name: entry.name(fileStem(file)) },
    };
  });
}

function parseComponentDefinition(
  call: ts.CallExpression,
  manifestPath: string
): ComponentDefinition<object, ComponentRecord | undefined> {
  const argument = call.arguments[0];
  if (!argument) return {};

  if (!ts.isObjectLiteralExpression(argument)) {
    throw new Error(`defineComponent() in ${manifestPath} must take an object literal`);
  }

  const definition: {
    name?: string;
    root?: string;
    parts?: Record<string, ComponentDefinition<object, ComponentRecord | undefined>>;
  } = {};

  for (const property of argument.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propertyName(property.name);
    if (name === 'name' || name === 'root') {
      if (!ts.isStringLiteral(property.initializer)) {
        throw new Error(`defineComponent() in ${manifestPath} requires a literal \`${name}:\` field`);
      }
      definition[name] = property.initializer.text;
      continue;
    }
    if (name !== 'parts') continue;
    if (!ts.isObjectLiteralExpression(property.initializer)) {
      throw new Error(`defineComponent() in ${manifestPath} requires an object literal \`parts:\` field`);
    }

    definition.parts = Object.fromEntries(
      property.initializer.properties.map((part) => {
        if (!ts.isPropertyAssignment(part) || !isDefineComponentCall(part.initializer)) {
          throw new Error(`defineComponent() in ${manifestPath} requires literal component parts`);
        }
        return [propertyName(part.name), parseComponentDefinition(part.initializer, manifestPath)];
      })
    );
  }

  return definition as ComponentDefinition<object, ComponentRecord | undefined>;
}

function propertyName(name: ts.PropertyName): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  throw new Error('Component definition property names must be static.');
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

  const header = `// Generated by the VJSC bundler plugin.
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

export default defineSchema('${source}', DEFINITIONS);`;
}
