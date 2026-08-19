import { globSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import { isPlainObject } from '@videojs/utils/predicate';
import ts from 'typescript';

import { type GeneratedFileOptions, type GeneratedFileResult, writeGeneratedFile } from '../../utils/generated-file';
import { resolveSourceModule, sourceScriptKind } from '../../utils/source-module';
import type { ComponentDefinition, ComponentRecord, ComponentSet } from '../definition';
import type { TargetReference } from '../registry';

export interface ResolvedTarget {
  readonly name: string;
  readonly target: TargetReference;
  /** Prefer this target when multiple source modules expose the same component. */
  readonly priority?: number | undefined;
}

export interface ResolvedSourceModule {
  readonly fileName: string;
  readonly sourceFile: ts.SourceFile;
}

export interface SourceTargetContext {
  readonly fileName: string;
  readonly sourceFile: ts.SourceFile;
  readonly resolveModule: (specifier: string) => ResolvedSourceModule | undefined;
}

export interface ComponentTargetContext {
  readonly component: string;
  readonly part: string | null;
}

export type ComponentTargetResolver = (context: ComponentTargetContext) => TargetReference | undefined;
export type SourceTargetResolver = (context: SourceTargetContext) => readonly ResolvedTarget[];

export interface GenerateComponentTargetConfig {
  readonly components: ComponentSet;
  readonly output: string;
  readonly resolve: ComponentTargetResolver;
  readonly files?: never;
}

export interface GenerateSourceTargetConfig {
  readonly files: string | readonly string[];
  readonly output: string;
  readonly resolve: SourceTargetResolver;
  readonly components?: never;
}

export type GenerateTargetConfig = GenerateComponentTargetConfig | GenerateSourceTargetConfig;
export type GenerateTargetOptions = GeneratedFileOptions;
export type GenerateTargetResult = GeneratedFileResult;

type TargetNode =
  | { readonly name: string; readonly target: TargetReference }
  | { readonly name: string; readonly children: readonly TargetNode[] };

export function generateTarget(
  config: GenerateTargetConfig,
  options: GenerateTargetOptions = {}
): GenerateTargetResult {
  const cwd = options.cwd ?? process.cwd();
  const nodes = isComponentTargetConfig(config) ? resolveComponentTargets(config) : resolveSourceTargets(config, cwd);

  if (nodes.length === 0) throw new Error('No component targets were generated.');

  const code = emitTargets(nodes);
  return writeGeneratedFile(config.output, code, options);
}

function isComponentTargetConfig(config: GenerateTargetConfig): config is GenerateComponentTargetConfig {
  return config.components !== undefined;
}

export function parseGenerateTargetConfig(value: unknown, location: string): readonly GenerateTargetConfig[] {
  const configs = Array.isArray(value) ? value : [value];

  for (const [index, config] of configs.entries()) {
    const configLocation = configs.length === 1 ? location : `${location}[${index}]`;
    validateConfig(config, configLocation);
  }

  return configs;
}

function resolveComponentTargets(config: GenerateComponentTargetConfig): TargetNode[] {
  return Object.entries(config.components.definitions)
    .map(([name, definition]) => resolveDefinition(name, definition, config.resolve))
    .sort(compareNodes);
}

function resolveDefinition(
  component: string,
  definition: ComponentDefinition<object, ComponentRecord | undefined>,
  resolveTarget: ComponentTargetResolver,
  part: string | null = null,
  name = component
): TargetNode {
  if (!definition.parts) {
    const target = resolveTarget({ component, part });
    if (!target)
      throw new Error(`Target resolver did not provide a target for <${component}${part ? `.${part}` : ''}>.`);

    return { name, target };
  }

  return {
    name,
    children: Object.entries(definition.parts)
      .map(([childName, child]) =>
        resolveDefinition(component, child, resolveTarget, part ? `${part}.${childName}` : childName, childName)
      )
      .sort(compareNodes),
  };
}

function resolveSourceTargets(config: GenerateSourceTargetConfig, cwd: string): TargetNode[] {
  const patterns = typeof config.files === 'string' ? [config.files] : config.files;
  const sourceModules = new Map<string, ResolvedSourceModule>();
  const targets = patterns.flatMap((pattern) =>
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
  const candidates = new Map<string, ResolvedTarget[]>();

  for (const target of targets) {
    const entries = candidates.get(target.name) ?? [];
    entries.push(target);
    candidates.set(target.name, entries);
  }

  const selected = [...candidates.values()].map((entries) => {
    const sorted = entries.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    if (sorted[1] && (sorted[0]!.priority ?? 0) === (sorted[1].priority ?? 0)) {
      throw new Error(`Duplicate component target: ${sorted[0]!.name}`);
    }

    return sorted[0]!;
  });

  return selected.map(({ name, target }) => ({ name, target })).sort(compareNodes);
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

function emitTargets(nodes: readonly TargetNode[]): string {
  const declarations = nodes.map((node) => `export const ${node.name} = ${emitNode(node, 0)};`).join('\n\n');
  const names = nodes.map((node) => `  ${node.name},`).join('\n');
  const helpers = collectTargetHelpers(nodes);

  return `// Generated by \`vjsc generate\`.
import { ${[...helpers].sort().join(', ')} } from 'vjsc/components';

${declarations}

export const targets = {
${names}
} as const;
`;
}

function emitNode(node: TargetNode, depth: number): string {
  if ('target' in node) {
    return node.target.tagName !== undefined
      ? emitElement(node.target, depth)
      : `defineTarget(${emitTarget(node.target, depth)})`;
  }

  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);
  const children = node.children
    .map((child) => `${childIndent}${child.name}: ${emitNode(child, depth + 1)},`)
    .join('\n');

  return `{\n${children}\n${indent}} as const`;
}

function collectTargetHelpers(nodes: readonly TargetNode[]): Set<'defineElement' | 'defineTarget'> {
  const helpers = new Set<'defineElement' | 'defineTarget'>();

  const visit = (node: TargetNode): void => {
    if ('children' in node) {
      for (const child of node.children) visit(child);
      return;
    }

    helpers.add(node.target.tagName !== undefined ? 'defineElement' : 'defineTarget');
  };

  for (const node of nodes) visit(node);
  return helpers;
}

function emitElement(target: Extract<TargetReference, { readonly tagName: string }>, depth: number): string {
  const properties: string[] = [];
  const propertyIndent = '  '.repeat(depth + 1);
  const importIndent = '  '.repeat(depth + 2);

  if (target.import) {
    properties.push(
      `${propertyIndent}import: {`,
      `${importIndent}from: ${quote(target.import.from)},`,
      `${importIndent}sideEffect: true,`,
      `${propertyIndent}},`
    );
  }

  properties.push(...emitMetadata(target, depth));
  if (properties.length === 0) return `defineElement(${quote(target.tagName)})`;

  const indent = '  '.repeat(depth);
  return `defineElement(${quote(target.tagName)}, {\n${properties.join('\n')}\n${indent}})`;
}

function emitTarget(
  target: Extract<TargetReference, { readonly import: { readonly name: string } }>,
  depth: number
): string {
  const indent = '  '.repeat(depth);
  const propertyIndent = '  '.repeat(depth + 1);
  const importIndent = '  '.repeat(depth + 2);

  const properties = [
    `${propertyIndent}import: {`,
    `${importIndent}from: ${quote(target.import.from)},`,
    `${importIndent}name: ${quote(target.import.name)},`,
  ];

  if (target.import.path?.length) {
    properties.push(`${importIndent}path: [${target.import.path.map(quote).join(', ')}],`);
  }

  properties.push(`${propertyIndent}},`);
  properties.push(...emitMetadata(target, depth));
  return `{\n${properties.join('\n')}\n${indent}}`;
}

function emitMetadata(target: TargetReference, depth: number): string[] {
  const propertyIndent = '  '.repeat(depth + 1);
  const importIndent = '  '.repeat(depth + 2);
  const properties: string[] = [];

  if (target.props) {
    properties.push(
      `${propertyIndent}props: {`,
      `${importIndent}from: ${quote(target.props.from)},`,
      `${importIndent}name: ${quote(target.props.name)},`
    );

    if (target.props.path?.length) {
      properties.push(`${importIndent}path: [${target.props.path.map(quote).join(', ')}],`);
    }

    if (target.props.intrinsic) {
      properties.push(`${importIndent}intrinsic: ${quote(target.props.intrinsic)},`);
    }

    if (target.props.children) {
      properties.push(`${importIndent}children: ${quote(target.props.children)},`);
    }

    properties.push(`${propertyIndent}},`);
  }

  return properties;
}

function compareNodes(a: TargetNode, b: TargetNode): number {
  return a.name.localeCompare(b.name);
}

function quote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function validateConfig(value: unknown, location: string): asserts value is GenerateTargetConfig {
  if (!isPlainObject(value)) throw invalidConfig(location, 'expected an object');
  if (typeof value.output !== 'string' || value.output.length === 0) {
    throw invalidConfig(location, '`output` must be a non-empty string');
  }

  const components = isPlainObject(value.components);
  const files =
    typeof value.files === 'string' ||
    (Array.isArray(value.files) && value.files.length > 0 && value.files.every((file) => typeof file === 'string'));

  if (components === files) {
    throw invalidConfig(location, 'expected either `components` or `files`');
  }
  if (typeof value.resolve !== 'function') {
    throw invalidConfig(location, '`resolve` must be a function');
  }
}

function invalidConfig(location: string, message: string): Error {
  return new Error(`Invalid component target generator config ${location}: ${message}.`);
}
