import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { type ReturnedRule, transform as transformCss } from 'lightningcss';

import type { ModuleMeta } from '../components/meta';
import { isInsideRoot } from '../utils/path';
import type { GraphModule, Graph } from './types';

const LOCAL_CSS_IMPORT = /@import\s+["'](\.[^"']+)["']\s*;/g;

export interface BundleStylesOptions {
  /** Human-readable owner used in diagnostics and the generated CSS filename. */
  readonly label: string;
  /** Additional authored CSS files relative to the module graph root. */
  readonly files?: readonly string[] | undefined;
  /** Include only the virtual stylesheet asset with this decoded filename. */
  readonly asset?: string | undefined;
  /** Whether captured virtual stylesheet assets should be included. */
  readonly includeAssets?: boolean | undefined;
}

/** Merge exact authored and transformed styles used by a set of module graph modules. */
export async function bundleStyles<Node extends ModuleMeta>(
  graph: Graph<Node>,
  modules: readonly GraphModule<Node>[],
  options: BundleStylesOptions
): Promise<string> {
  const styles = new Map<string, string>();

  for (const path of options.files ?? []) {
    const filename = resolve(graph.root, path);

    assertInsideRoot(graph.root, filename, path);
    addUnique(styles, path, await inlineLocalCssImports(filename, graph.root, new Set()), options.label);
  }

  if (options.includeAssets !== false) {
    for (const module of modules) {
      for (const id of module.styles.assets) {
        if (id.endsWith('/base.css')) continue;

        if (options.asset && virtualStyleFilename(id) !== options.asset) continue;

        const source = graph.assets.get(id);

        if (source === undefined) {
          throw new Error(`VJSC graph style \`${options.label}\` has no captured asset: \`${id}\`.`);
        }

        addUnique(styles, id, source, options.label);
      }
    }
  }

  const source = `${[...styles]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, content]) => content.trim())
    .filter(Boolean)
    .join('\n\n')}\n`;

  return mergeStyles(source, `${options.label}.css`);
}

function mergeStyles(source: string, filename: string): string {
  const context: string[] = [];
  const rules = new Set<string>();

  const result = transformCss({
    filename,
    code: new TextEncoder().encode(source),
    minify: false,
    visitor: {
      Rule(rule) {
        const nested = hasNestedRules(rule);

        if (rule.type === 'style' || !nested) {
          const key = JSON.stringify([context, rule], omitRuleDetails);
          if (rules.has(key)) return [];

          rules.add(key);
        }

        if (rule.type !== 'style' && nested) context.push(JSON.stringify(rule, omitRuleDetails));

        return undefined;
      },
      RuleExit(rule) {
        if (rule.type !== 'style' && hasNestedRules(rule)) context.pop();
      },
    },
  });

  return new TextDecoder().decode(result.code);
}

function hasNestedRules(rule: ReturnedRule): boolean {
  if (!('value' in rule)) return false;

  const value = rule.value;

  return Boolean(value && typeof value === 'object' && 'rules' in value && Array.isArray(value.rules));
}

function omitRuleDetails(key: string, value: unknown): unknown {
  return key === 'loc' || key === 'rules' ? undefined : value;
}

function virtualStyleFilename(id: string): string | undefined {
  if (!id.startsWith('virtual:vjsc/css/')) return undefined;

  return decodeURIComponent(id.slice(id.lastIndexOf('/') + 1));
}

async function inlineLocalCssImports(filename: string, root: string, stack: Set<string>): Promise<string> {
  if (stack.has(filename)) throw new Error(`Circular module graph stylesheet import: \`${filename}\`.`);

  const source = await readFile(filename, 'utf8');
  const imports = [...source.matchAll(LOCAL_CSS_IMPORT)];
  if (imports.length === 0) return source;

  stack.add(filename);
  let output = source;

  for (const match of imports.reverse()) {
    const specifier = match[1];
    const start = match.index;
    if (!specifier || start === undefined) continue;

    const imported = resolve(dirname(filename), specifier);

    assertInsideRoot(root, imported, specifier);
    const content = await inlineLocalCssImports(imported, root, stack);

    output = output.slice(0, start) + content.trim() + output.slice(start + match[0].length);
  }

  stack.delete(filename);
  return output;
}

function assertInsideRoot(root: string, filename: string, source: string): void {
  if (!isInsideRoot(root, filename)) throw new Error(`VJSC graph style is outside its root: \`${source}\`.`);
}

function addUnique(files: Map<string, string>, path: string, content: string, label: string): void {
  const previous = files.get(path);

  if (previous !== undefined && previous !== content) {
    throw new Error(`VJSC graph style \`${label}\` has conflicting contents for \`${path}\`.`);
  }

  files.set(path, content);
}
