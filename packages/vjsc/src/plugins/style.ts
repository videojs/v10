import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Expression, ImportDeclaration, Node, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin, RolldownMagicString } from 'rolldown';

import type { SourceEdit } from '../ast';
import { insertModuleImports } from '../ast/imports';
import { compileStyles } from '../styles/compile';
import { type DesignSystem, loadDesignSystem } from '../styles/design-system';
import {
  diagnoseCompiledStyles,
  diagnoseStyleManifest,
  formatStyleDiagnostic,
  type StyleDiagnostic,
  type VjscDiagnosticsOptions,
} from '../styles/diagnostics';
import {
  loadStyleManifest,
  ruleForToken,
  type StyleManifest,
  type StyleManifestRule,
  utilityGroupsForRule,
} from '../styles/manifest';
import { isStyleModulePath, resolveManifestStyleModule, resolveStyleModuleFile } from '../styles/modules';
import type { StylePluginOptions } from '../styles/options';
import { moduleFilename, type ParsedModuleId, parseModuleId } from '../utils/module-id';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

export interface StyleModule extends ParsedModuleId {
  readonly id: string;
}

export type StylePluginConfig =
  | StylePluginOptions
  | ((module: StyleModule) => StylePluginOptions | null | Promise<StylePluginOptions | null>);

interface CachedManifest {
  readonly manifest: StyleManifest;
  readonly versions: ReadonlyMap<string, number>;
}

interface CachedDesignSystem {
  readonly design: DesignSystem;
  versions: ReadonlyMap<string, number>;
}

interface StyleBinding {
  readonly declaration: ImportDeclaration;
  readonly modulePath: string;
}

interface VirtualCssModule {
  readonly source: string;
  readonly owners: Set<string>;
}

export function stylePlugin(config: StylePluginConfig, diagnostics: VjscDiagnosticsOptions = {}): Plugin {
  const designs = new Map<string, Promise<CachedDesignSystem>>();
  const manifests = new Map<string, CachedManifest>();
  const cssById = new Map<string, VirtualCssModule>();
  const cssByOwner = new Map<string, ReadonlySet<string>>();
  const reportedWarnings = new Set<string>();
  let cwd = process.cwd();

  return {
    name: 'vjsc:styles',
    options(options) {
      cwd = resolve(options.cwd ?? process.cwd());
      return null;
    },
    buildStart() {
      reportedWarnings.clear();
    },
    resolveId(id) {
      return cssById.has(id) ? `\0${id}` : null;
    },
    load(id) {
      const publicId = id.startsWith('\0') ? id.slice(1) : id;

      return cssById.get(publicId)?.source ?? null;
    },
    transform: {
      filter: { id: SCRIPT_ID, code: '.styles' },
      async handler(_code, id, transform) {
        const options = typeof config === 'function' ? await config({ id, ...parseModuleId(id) }) : config;

        if (!options || !transform.ast || !transform.magicString) {
          replaceVirtualCss(cssById, cssByOwner, id, []);
          return null;
        }

        const filename = moduleFilename(id);
        const files = importedStyleFiles(filename, transform.ast);

        if (files.length === 0) {
          replaceVirtualCss(cssById, cssByOwner, id, []);
          return null;
        }

        const manifest = options.manifest ?? (await cachedManifest(manifests, files));

        if (manifest.rules.length === 0) {
          replaceVirtualCss(cssById, cssByOwner, id, []);
          return null;
        }

        for (const file of manifest.watchFiles) this.addWatchFile(file);

        const styleDiagnostics = [...diagnoseStyleManifest(manifest, options.variants)];
        const report = () => {
          for (const diagnostic of mergeStyleDiagnostics(styleDiagnostics)) {
            reportStyleDiagnostic(diagnostic, diagnostics, reportedWarnings, (message) => this.warn(message));
          }
        };

        const referencedRules = transformStyles(filename, transform.ast, transform.magicString, manifest, options);

        if (referencedRules.size === 0) {
          report();
          replaceVirtualCss(cssById, cssByOwner, id, []);
          return null;
        }

        if (options.mode === 'css' && options.stylesheet) {
          const input = resolve(cwd, options.stylesheet.input);
          const base = options.stylesheet.base ? resolve(cwd, options.stylesheet.base) : undefined;
          const cachedDesign = await cachedDesignSystem(designs, input);

          styleDiagnostics.push(
            ...diagnoseCompiledStyles(manifest, cachedDesign.design, referencedRules, options.variants)
          );
          report();
          const assets = await compileStyles({
            design: cachedDesign.design,
            manifest,
            ...(options.stylesheet.scope ? { scope: options.stylesheet.scope } : {}),
            ...(options.variants ? { variants: options.variants } : {}),
            ruleClassNames: referencedRules,
          });

          cachedDesign.versions = await fileVersions(cachedDesign.design.watchFiles);

          for (const file of cachedDesign.design.watchFiles) this.addWatchFile(file);

          const imports: string[] = [];
          const modules: Array<readonly [string, string]> = [];

          if (base) {
            this.addWatchFile(base);
            const source = `@import ${JSON.stringify(base.replaceAll('\\', '/'))};`;
            const publicId = cssVirtualId('base.css', source);

            modules.push([publicId, source]);
            imports.push(`import ${JSON.stringify(publicId)};`);
          }

          for (const [fileName, source] of assets) {
            const publicId = cssVirtualId(fileName, source);

            modules.push([publicId, source]);
            imports.push(`import ${JSON.stringify(publicId)};`);
          }

          replaceVirtualCss(cssById, cssByOwner, id, modules);
          insertModuleImports(transform.ast, transform.magicString, imports);
        } else {
          report();
          replaceVirtualCss(cssById, cssByOwner, id, []);
        }

        return { code: transform.magicString };
      },
    },
  };
}

function mergeStyleDiagnostics(diagnostics: readonly StyleDiagnostic[]): readonly StyleDiagnostic[] {
  const merged = new Map<string, StyleDiagnostic>();

  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}:${diagnostic.rule.modulePath}:${diagnostic.rule.tokenPath.join('.')}`;
    const previous = merged.get(key);

    if (!previous) {
      merged.set(key, diagnostic);
      continue;
    }

    merged.set(key, {
      ...previous,
      utilities: [...new Set([...previous.utilities, ...diagnostic.utilities])],
    });
  }

  return [...merged.values()];
}

function reportStyleDiagnostic(
  diagnostic: StyleDiagnostic,
  options: VjscDiagnosticsOptions,
  reportedWarnings: Set<string>,
  warn: (message: string) => void
): void {
  const message = formatStyleDiagnostic(diagnostic);
  const level = options.complexSelectors ?? 'warn';
  if (diagnostic.kind === 'error' || level === 'error') throw new Error(message);

  if (level === 'off' || reportedWarnings.has(message)) return;

  reportedWarnings.add(message);
  warn(message);
}

function replaceVirtualCss(
  cssById: Map<string, VirtualCssModule>,
  cssByOwner: Map<string, ReadonlySet<string>>,
  owner: string,
  modules: readonly (readonly [id: string, source: string])[]
): void {
  const nextIds = new Set(modules.map(([id]) => id));

  for (const id of cssByOwner.get(owner) ?? []) {
    if (nextIds.has(id)) continue;

    const module = cssById.get(id);

    module?.owners.delete(owner);

    if (module?.owners.size === 0) cssById.delete(id);
  }

  for (const [id, source] of modules) {
    const module = cssById.get(id);

    if (module) {
      module.owners.add(owner);
    } else {
      cssById.set(id, { source, owners: new Set([owner]) });
    }
  }

  if (nextIds.size > 0) cssByOwner.set(owner, nextIds);
  else cssByOwner.delete(owner);
}

function transformStyles(
  filename: string,
  ast: Program,
  magicString: RolldownMagicString,
  manifest: StyleManifest,
  options: StylePluginOptions
): ReadonlySet<string> {
  const bindings = styleBindings(filename, ast, manifest);
  if (bindings.size === 0) return new Set();

  const edits: SourceEdit[] = [];
  const referencedRules = new Set<string>();
  const transformedRanges: Array<readonly [number, number]> = [];

  walk(ast, {
    enter(node) {
      if (
        node.type !== 'JSXAttribute' ||
        node.name.type !== 'JSXIdentifier' ||
        node.name.name !== 'className' ||
        node.value?.type !== 'JSXExpressionContainer' ||
        node.value.expression.type === 'JSXEmptyExpression'
      ) {
        return;
      }

      walk(node.value.expression, {
        enter(expression, parent) {
          if (expression.type !== 'MemberExpression') return;

          const path = readAccessPath(expression);
          const [root, ...tokenPath] = path ?? [];
          const binding = root ? bindings.get(root) : undefined;
          const rule = binding ? ruleForToken(manifest, binding.modulePath, tokenPath) : undefined;
          if (!rule) return;

          edits.push({
            start: expression.start,
            end: expression.end,
            content: renderStyleRule(rule, options, isListItem(expression, parent)),
          });
          referencedRules.add(rule.className);
          transformedRanges.push([expression.start, expression.end]);
          this.skip();
        },
      });
    },
  });

  assertNoUntransformedReferences(ast, bindings, transformedRanges);

  for (const edit of edits) magicString.overwrite(edit.start, edit.end, edit.content);

  for (const binding of new Set(bindings.values())) {
    magicString.remove(binding.declaration.start, binding.declaration.end);
  }

  return referencedRules;
}

function styleBindings(filename: string, ast: Program, manifest: StyleManifest): ReadonlyMap<string, StyleBinding> {
  const bindings = new Map<string, StyleBinding>();

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration' || !statement.source.value.startsWith('.')) continue;

    const modulePath = resolveManifestStyleModule(filename, statement.source.value, manifest);
    if (!modulePath) continue;

    const defaults = statement.specifiers.filter((specifier) => specifier.type === 'ImportDefaultSpecifier');

    if (defaults.length !== 1 || statement.specifiers.length !== 1) {
      throw sourceError(`Style import \`${statement.source.value}\` must use a default import.`, statement.start);
    }

    bindings.set(defaults[0]!.local.name, { declaration: statement, modulePath });
  }

  return bindings;
}

function importedStyleFiles(filename: string, ast: Program): string[] {
  const files: string[] = [];

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration') continue;

    const specifier = statement.source.value;
    if (!specifier.startsWith('.') || !isStyleModulePath(specifier)) continue;

    const file = resolveStyleModuleFile(filename, specifier);

    if (!file) {
      throw sourceError(`Cannot resolve style module \`${specifier}\` imported by \`${filename}\`.`, statement.start);
    }

    files.push(file);
  }

  return [...new Set(files)];
}

function readAccessPath(expression: Expression): string[] | undefined {
  if (expression.type === 'Identifier') return [expression.name];

  if (expression.type !== 'MemberExpression') return undefined;

  const object = readAccessPath(expression.object);
  if (!object) return undefined;

  if (!expression.computed) return [...object, expression.property.name];

  if (expression.property.type === 'Literal' && typeof expression.property.value === 'string') {
    return [...object, expression.property.value];
  }

  return undefined;
}

function renderStyleRule(rule: StyleManifestRule, options: StylePluginOptions, listItem: boolean): string {
  const groups = options.mode === 'css' ? [rule.className] : utilityGroupsForRule(rule, options.variants);
  const values = groups.filter(Boolean);

  if (listItem) return values.length > 0 ? values.map((value) => JSON.stringify(value)).join(', ') : '""';

  return JSON.stringify(values.join(' '));
}

function isListItem(expression: Expression, parent: Node | null): boolean {
  return Boolean(
    (parent?.type === 'ArrayExpression' && parent.elements.includes(expression)) ||
    (parent?.type === 'CallExpression' && parent.arguments.includes(expression))
  );
}

function assertNoUntransformedReferences(
  ast: Program,
  bindings: ReadonlyMap<string, StyleBinding>,
  transformed: readonly (readonly [number, number])[]
): void {
  const unresolved = new Map<string, number[]>();

  walk(ast, {
    enter(node) {
      if (node.type !== 'Identifier' || !bindings.has(node.name)) return;

      const binding = bindings.get(node.name)!;
      const inImport = node.start >= binding.declaration.start && node.end <= binding.declaration.end;
      const inTransform = transformed.some(([start, end]) => node.start >= start && node.end <= end);

      if (!inImport && !inTransform) {
        const positions = unresolved.get(node.name) ?? [];

        positions.push(node.start);
        unresolved.set(node.name, positions);
      }
    },
  });

  if (unresolved.size > 0) {
    throw sourceError(
      `Styles must use static className references. Could not transform: ${[...unresolved]
        .map(([name, positions]) => `${name} at ${positions.join(', ')}`)
        .join('; ')}.`,
      Math.min(...[...unresolved.values()].flat())
    );
  }
}

function sourceError(message: string, pos: number): Error {
  return Object.assign(new Error(message), { pos });
}

async function cachedManifest(cache: Map<string, CachedManifest>, files: readonly string[]): Promise<StyleManifest> {
  const key = [...files].sort().join('\0');
  const cached = cache.get(key);
  if (cached && (await versionsMatch(cached.versions))) return cached.manifest;

  const manifest = await loadStyleManifest(files);

  cache.set(key, { manifest, versions: await fileVersions(manifest.watchFiles) });
  return manifest;
}

async function fileVersions(files: Iterable<string>): Promise<ReadonlyMap<string, number>> {
  return new Map(await Promise.all([...files].map(async (file) => [file, (await stat(file)).mtimeMs] as const)));
}

async function versionsMatch(versions: ReadonlyMap<string, number>): Promise<boolean> {
  try {
    for (const [file, mtimeMs] of versions) {
      if ((await stat(file)).mtimeMs !== mtimeMs) return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function cachedDesignSystem(
  cache: Map<string, Promise<CachedDesignSystem>>,
  input: string
): Promise<CachedDesignSystem> {
  const cached = await cache.get(input);
  if (cached && (await versionsMatch(cached.versions))) return cached;

  const loading = loadDesignSystem(input).then(async (design) => ({
    design,
    versions: await fileVersions(design.watchFiles),
  }));

  cache.set(input, loading);
  return loading;
}

function cssVirtualId(fileName: string, source: string): string {
  const hash = createHash('sha256').update(fileName).update('\0').update(source).digest('hex').slice(0, 12);

  return `virtual:vjsc/css/${hash}/${encodeURIComponent(fileName)}`;
}
