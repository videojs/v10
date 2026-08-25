import { globSync, readFileSync } from 'node:fs';

import type { CallExpression, ExportDefaultDeclaration, PropertyKey } from '@oxc-project/types';
import { parseSync } from 'oxc-parser';

import { toArray } from '../../utils/array';
import { absolutePath, fileStem } from '../../utils/path';
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
  const parsed = parseSync(fileName, readFileSync(fileName, 'utf8'));
  if (parsed.errors.length > 0) throw new Error(parsed.errors.map((error) => error.message).join('\n'));

  const exported = parsed.program.body.find(
    (statement): statement is ExportDefaultDeclaration =>
      statement.type === 'ExportDefaultDeclaration' && isDefineComponentCall(statement.declaration)
  );
  if (!exported) throw new Error(`No \`export default defineComponent(...)\` found in ${fileName}`);

  const definition = parseComponentDefinition(exported.declaration as CallExpression, fileName);
  if (!definition.name) throw new Error(`defineComponent() in ${fileName} is missing a literal \`name:\` field`);

  return {
    name: definition.name,
    definition,
  };
}

function isDefineComponentCall(node: unknown): node is CallExpression {
  if (!node || typeof node !== 'object') return false;

  const candidate = node as { readonly type?: unknown; readonly callee?: unknown };
  if (candidate.type !== 'CallExpression' || !candidate.callee || typeof candidate.callee !== 'object') return false;

  const callee = candidate.callee as { readonly type?: unknown; readonly name?: unknown };

  return callee.type === 'Identifier' && callee.name === 'defineComponent';
}

function parseComponentDefinition(
  call: CallExpression,
  fileName: string
): ComponentDefinition<object, ComponentRecord | undefined> {
  const argument = call.arguments[0];
  if (!argument) return {};

  if (argument.type !== 'ObjectExpression') {
    throw new Error(`defineComponent() in ${fileName} must take an object literal`);
  }

  const definition: {
    name?: string;
    root?: string;
    parts?: Record<string, ComponentDefinition<object, ComponentRecord | undefined>>;
  } = {};

  for (const property of argument.properties) {
    if (property.type !== 'Property' || property.kind !== 'init' || property.method) continue;

    const name = staticPropertyName(property.key);

    if (name === 'name' || name === 'root') {
      if (property.value.type !== 'Literal' || typeof property.value.value !== 'string') {
        throw new Error(`defineComponent() in ${fileName} requires a literal \`${name}:\` field`);
      }

      definition[name] = property.value.value;
      continue;
    }

    if (name !== 'parts') continue;

    if (property.value.type !== 'ObjectExpression') {
      throw new Error(`defineComponent() in ${fileName} requires an object literal \`parts:\` field`);
    }

    definition.parts = Object.fromEntries(
      property.value.properties.map((part) => {
        if (part.type !== 'Property' || part.kind !== 'init' || part.method || !isDefineComponentCall(part.value)) {
          throw new Error(`defineComponent() in ${fileName} requires literal component parts`);
        }

        return [staticPropertyName(part.key), parseComponentDefinition(part.value, fileName)];
      })
    );
  }

  return definition as ComponentDefinition<object, ComponentRecord | undefined>;
}

function staticPropertyName(name: PropertyKey): string {
  if (name.type === 'Identifier') return name.name;

  if (name.type === 'Literal' && (typeof name.value === 'string' || typeof name.value === 'number')) {
    return String(name.value);
  }

  throw new Error('Component definition property names must be static.');
}
