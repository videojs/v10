import { globSync, readFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';

import ts from 'typescript';
import { propertyNameText } from '../../ts/utils/declarations';
import { parseSourceFile } from '../../ts/utils/source-file';
import type { ComponentDefinition, ComponentRecord } from '../definition';

export interface ComponentFileSet {
  readonly include: string;
  readonly exclude?: string | readonly string[] | undefined;
  readonly name: (filename: string) => string;
}

export type ComponentSource = string | ComponentFileSet;

export interface DiscoverSchemaOptions {
  readonly cwd: string;
  readonly include: readonly ComponentSource[];
  readonly exclude?: string | readonly string[] | undefined;
}

export interface ManifestSchemaComponent {
  readonly kind: 'manifest';
  readonly fileName: string;
  readonly name: string;
  readonly definition: ComponentDefinition<object, ComponentRecord | undefined>;
}

export interface FileSchemaComponent {
  readonly kind: 'file';
  readonly fileName: string;
  readonly name: string;
  readonly definition: ComponentDefinition<object, undefined>;
}

export type SchemaComponent = ManifestSchemaComponent | FileSchemaComponent;

export interface DiscoveredSchema {
  readonly components: readonly SchemaComponent[];
  readonly watchFiles: readonly string[];
}

/** Discover component definitions and their watched source files. */
export function discoverSchema(options: DiscoverSchemaOptions): DiscoveredSchema {
  const components = options.include.flatMap<SchemaComponent>((source) =>
    typeof source === 'string'
      ? discoverManifests(source, options.exclude, options.cwd)
      : discoverFiles(source, options.cwd)
  );

  return {
    components,
    watchFiles: [...new Set(components.map((component) => component.fileName))].sort(),
  };
}

function discoverManifests(
  pattern: string,
  exclude: string | readonly string[] | undefined,
  cwd: string
): ManifestSchemaComponent[] {
  return globSync(pattern, { cwd, ...(exclude ? { exclude: toArray(exclude) } : {}) }).map((path) => {
    const fileName = absolutePath(cwd, path);
    return { kind: 'manifest', fileName, ...parseComponentManifest(fileName) };
  });
}

function discoverFiles(source: ComponentFileSet, cwd: string): FileSchemaComponent[] {
  return globSync(source.include, {
    cwd,
    ...(source.exclude ? { exclude: toArray(source.exclude) } : {}),
  }).map((path) => {
    const fileName = absolutePath(cwd, path);
    const name = source.name(fileStem(path));
    return { kind: 'file', fileName, name, definition: { name } };
  });
}

function parseComponentManifest(fileName: string): Pick<ManifestSchemaComponent, 'definition' | 'name'> {
  const sourceFile = parseSourceFile(readFileSync(fileName, 'utf8'), fileName);
  const call = findDefaultExportCall(sourceFile);

  if (!call) throw new Error(`No \`export default defineComponent(...)\` found in ${fileName}`);

  const definition = parseComponentDefinition(call, fileName);
  if (!definition.name) throw new Error(`defineComponent() in ${fileName} is missing a literal \`name:\` field`);
  return { name: definition.name, definition };
}

function findDefaultExportCall(sourceFile: ts.SourceFile): ts.CallExpression | undefined {
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals && isDefineComponentCall(statement.expression)) {
      return statement.expression;
    }
  }

  return undefined;
}

function isDefineComponentCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineComponent';
}

function parseComponentDefinition(
  call: ts.CallExpression,
  fileName: string
): ComponentDefinition<object, ComponentRecord | undefined> {
  const argument = call.arguments[0];
  if (!argument) return {};

  if (!ts.isObjectLiteralExpression(argument)) {
    throw new Error(`defineComponent() in ${fileName} must take an object literal`);
  }

  const definition: {
    name?: string;
    root?: string;
    parts?: Record<string, ComponentDefinition<object, ComponentRecord | undefined>>;
  } = {};

  for (const property of argument.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = staticPropertyName(property.name);
    if (name === 'name' || name === 'root') {
      if (!ts.isStringLiteral(property.initializer)) {
        throw new Error(`defineComponent() in ${fileName} requires a literal \`${name}:\` field`);
      }
      definition[name] = property.initializer.text;
      continue;
    }
    if (name !== 'parts') continue;
    if (!ts.isObjectLiteralExpression(property.initializer)) {
      throw new Error(`defineComponent() in ${fileName} requires an object literal \`parts:\` field`);
    }

    definition.parts = Object.fromEntries(
      property.initializer.properties.map((part) => {
        if (!ts.isPropertyAssignment(part) || !isDefineComponentCall(part.initializer)) {
          throw new Error(`defineComponent() in ${fileName} requires literal component parts`);
        }
        return [staticPropertyName(part.name), parseComponentDefinition(part.initializer, fileName)];
      })
    );
  }

  return definition as ComponentDefinition<object, ComponentRecord | undefined>;
}

function staticPropertyName(name: ts.PropertyName): string {
  const value = propertyNameText(name);
  if (value === undefined) throw new Error('Component definition property names must be static.');
  return value;
}

function absolutePath(cwd: string, path: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

function fileStem(path: string): string {
  return basename(path, extname(path));
}

function toArray(value: string | readonly string[]): readonly string[] {
  return typeof value === 'string' ? [value] : value;
}
