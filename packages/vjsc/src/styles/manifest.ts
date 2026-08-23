import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Expression, Program } from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import { walk } from 'oxc-walker';
import { type OutputChunk, rolldown } from 'rolldown';
import { twMerge } from 'tailwind-merge';

import { toArray } from '../utils/array';
import { splitClassNames } from './class-names';
import { getStyleDefinition, type StyleDefinition, type StyleValue, validateStyleDefinition } from './define';
import { resolveManifestStyleModule } from './modules';
import { visitStyleRules } from './tree';

const STYLE_RUNTIME_ID = '\0vjsc:styles-runtime';

export interface StyleManifestRule {
  readonly modulePath: string;
  readonly tokenPath: readonly string[];
  readonly className: string;
  readonly file: string;
  readonly layer: string;
  readonly scopeRoot: boolean;
  readonly utilityGroups: readonly string[];
  readonly utilities: readonly string[];
  readonly variantGroups: Readonly<Record<string, readonly string[]>>;
  readonly variants: Readonly<Record<string, readonly string[]>>;
}

export interface StyleManifest {
  readonly modules: ReadonlyMap<string, ReadonlyMap<string, StyleManifestRule>>;
  readonly rules: readonly StyleManifestRule[];
  readonly watchFiles: readonly string[];
}

/** Evaluate controlled style modules and normalize their explicit definitions. */
export async function loadStyleManifest(files: readonly string[]): Promise<StyleManifest> {
  const moduleFiles = [...new Set(files.map((file) => resolve(file)))].sort();

  const loaded = await Promise.all(
    moduleFiles.map(async (inputFile) => {
      const modulePath = await realpath(inputFile);
      const evaluated = await evaluateStyleModule(modulePath);
      const definition = getStyleDefinition(evaluated.module.default);
      if (!definition) throw new Error(`Style module \`${inputFile}\` must default-export \`styles({...})\`.`);

      return { definition, modulePath, watchFiles: evaluated.watchFiles };
    })
  );

  return createStyleManifest(loaded);
}

export function ruleForToken(
  manifest: StyleManifest,
  modulePath: string,
  tokenPath: readonly string[]
): StyleManifestRule | undefined {
  return manifest.modules.get(modulePath)?.get(tokenKey(tokenPath));
}

export function utilityGroupsForRule(rule: StyleManifestRule, variants: readonly string[] = []): readonly string[] {
  const selected = variants.flatMap((variant) => rule.variantGroups[variant] ?? []);
  if (selected.length === 0) return rule.utilityGroups;

  return mergeUtilityGroups([...rule.utilityGroups, ...selected]);
}

export function utilitiesForRule(rule: StyleManifestRule, variants: readonly string[] = []): readonly string[] {
  return utilityGroupsForRule(rule, variants).flatMap(splitClassNames);
}

/** Collect the exact semantic rules referenced by JSX source. */
export async function collectReferencedStyleRules(
  files: readonly string[],
  manifest: StyleManifest
): Promise<ReadonlySet<string>> {
  const referenced = new Set<string>();

  for (const file of files.filter((entry) => /\.(?:[cm]?ts|tsx)$/.test(entry))) {
    const sourceText = await readFile(file, 'utf8');
    const parsed = parseSync(file, sourceText);
    if (parsed.errors.length > 0) throw new Error(parsed.errors.map((error) => error.message).join('\n'));

    const bindings = styleBindings(parsed.program, file, manifest);
    if (bindings.size === 0) continue;

    walk(parsed.program, {
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
          enter(expression) {
            if (expression.type !== 'MemberExpression') return;

            const path = readAccessPath(expression);
            const [root, ...tokenPath] = path ?? [];
            const modulePath = root ? bindings.get(root) : undefined;
            const rule = modulePath ? ruleForToken(manifest, modulePath, tokenPath) : undefined;
            if (!rule) return;

            referenced.add(rule.className);
            this.skip();
          },
        });
      },
    });
  }

  return referenced;
}

export function isGroupMarker(value: string): boolean {
  return value === 'group' || value.startsWith('group/');
}

function createStyleManifest(
  loaded: readonly { definition: StyleDefinition; modulePath: string; watchFiles: readonly string[] }[]
): StyleManifest {
  const modules = new Map<string, ReadonlyMap<string, StyleManifestRule>>();
  const rules: StyleManifestRule[] = [];
  const classes = new Map<string, StyleManifestRule>();
  const files = new Map<string, string>();
  const watchFiles = new Set<string>();

  for (const { definition, modulePath, watchFiles: moduleWatchFiles } of loaded) {
    for (const file of moduleWatchFiles) watchFiles.add(file);

    validateStyleDefinition(definition);

    const previousLayer = files.get(definition.file);

    if (previousLayer && previousLayer !== definition.layer) {
      throw new Error(
        `Style output \`${definition.file}\` is assigned to both \`${previousLayer}\` and \`${definition.layer}\`.`
      );
    }

    files.set(definition.file, definition.layer);

    const moduleRules = new Map<string, StyleManifestRule>();

    visitStyleRules(definition.rules, (tokenPath, rule) => {
      const utilityGroups = splitUtilityGroups(rule.utilities);
      const variantGroups = Object.fromEntries(
        Object.entries(rule.variants ?? {}).map(([name, value]) => [name, Object.freeze(splitUtilityGroups(value))])
      );
      const manifestRule: StyleManifestRule = Object.freeze({
        modulePath,
        tokenPath: Object.freeze(tokenPath),
        className: rule.className,
        file: definition.file,
        layer: definition.layer,
        scopeRoot: rule.scopeRoot ?? false,
        utilityGroups: Object.freeze(utilityGroups),
        utilities: Object.freeze(utilityGroups.flatMap(splitClassNames)),
        variantGroups: Object.freeze(variantGroups),
        variants: Object.freeze(
          Object.fromEntries(
            Object.entries(variantGroups).map(([name, groups]) => [
              name,
              Object.freeze(groups.flatMap(splitClassNames)),
            ])
          )
        ),
      });

      const previous = classes.get(manifestRule.className);

      if (previous) {
        throw new Error(
          `Style class \`${manifestRule.className}\` is defined by both \`${displayRule(previous)}\` and \`${displayRule(manifestRule)}\`.`
        );
      }

      classes.set(manifestRule.className, manifestRule);
      moduleRules.set(tokenKey(tokenPath), manifestRule);
      rules.push(manifestRule);
    });

    modules.set(modulePath, moduleRules);
  }

  return Object.freeze({
    modules,
    rules: Object.freeze(rules),
    watchFiles: Object.freeze([...watchFiles].sort()),
  });
}

function styleBindings(ast: Program, filename: string, manifest: StyleManifest): ReadonlyMap<string, string> {
  const bindings = new Map<string, string>();

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration' || !statement.source.value.startsWith('.')) continue;

    const defaults = statement.specifiers.filter((specifier) => specifier.type === 'ImportDefaultSpecifier');
    if (defaults.length !== 1 || statement.specifiers.length !== 1) continue;

    const modulePath = resolveManifestStyleModule(filename, statement.source.value, manifest);

    if (modulePath) bindings.set(defaults[0]!.local.name, modulePath);
  }

  return bindings;
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

function splitUtilityGroups(value: StyleValue): string[] {
  const values = toArray(value);

  return values.map((part) => part.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

/** Preserve authored groups while removing utilities superseded by the selected variants. */
function mergeUtilityGroups(groups: readonly string[]): readonly string[] {
  const merged = twMerge(groups.join(' ')).split(/\s+/).filter(Boolean);
  const retained = new Map<string, number>();

  for (const utility of merged) retained.set(utility, (retained.get(utility) ?? 0) + 1);

  const output = Array.from({ length: groups.length }, () => [] as string[]);
  const indexedGroups = groups.map((group, index) => ({ index, utilities: splitClassNames(group) }));

  for (const { index, utilities } of indexedGroups.reverse()) {
    const outputGroup = output[index];
    if (!outputGroup) throw new Error('Failed to preserve a style utility group.');

    for (const utility of utilities.reverse()) {
      const remaining = retained.get(utility) ?? 0;
      if (remaining === 0) continue;

      outputGroup.unshift(utility);
      retained.set(utility, remaining - 1);
    }
  }

  return output.map((group) => group.join(' ')).filter(Boolean);
}

function tokenKey(path: readonly string[]): string {
  return path.join('.');
}

function displayRule(rule: StyleManifestRule): string {
  return `${rule.modulePath}#${rule.tokenPath.join('.')}`;
}

async function evaluateStyleModule(
  modulePath: string
): Promise<{ module: { default?: unknown }; watchFiles: readonly string[] }> {
  const bundle = await rolldown({
    input: modulePath,
    platform: 'node',
    experimental: {
      attachDebugInfo: 'none',
      nativeMagicString: true,
    },
    plugins: [
      {
        name: 'vjsc:styles-runtime',
        resolveId(source) {
          return source === 'vjsc/styles' ? STYLE_RUNTIME_ID : null;
        },
        load(id) {
          return id === STYLE_RUNTIME_ID ? styleRuntimeSource() : null;
        },
      },
    ],
  });

  try {
    const output = await bundle.generate({ format: 'esm', codeSplitting: false });
    const chunks = output.output.filter((item): item is OutputChunk => item.type === 'chunk');

    if (chunks.length !== 1 || !chunks[0]) {
      throw new Error(`Style module \`${modulePath}\` compiled to ${chunks.length} chunks.`);
    }

    const dataUrl = `data:text/javascript;base64,${Buffer.from(chunks[0].code).toString('base64')}`;

    return {
      module: (await import(dataUrl)) as { default?: unknown },
      watchFiles: await bundle.watchFiles,
    };
  } finally {
    await bundle.close();
  }
}

function styleRuntimeSource(): string {
  return `
    const styleDefinition = Symbol.for('vjsc/styles/definition');
    const isRule = (value) => value && typeof value === 'object' && 'className' in value && 'utilities' in value;
    const references = (tree) => Object.fromEntries(
      Object.entries(tree).map(([name, value]) => [name, isRule(value) ? value.className : references(value)])
    );
    const freeze = (value) => {
      for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
      return Object.freeze(value);
    };
    export function styles(definition) {
      const result = references(definition.rules);
      Object.defineProperty(result, styleDefinition, {
        configurable: false,
        enumerable: false,
        value: Object.freeze({ ...definition }),
        writable: false,
      });
      return freeze(result);
    }
  `;
}
