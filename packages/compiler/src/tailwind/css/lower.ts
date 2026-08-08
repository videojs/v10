import { isAbsolute, resolve } from 'node:path';
import {
  bundleAsync,
  type Declaration,
  type DeclarationBlock,
  Features,
  type Rule,
  type Selector,
  type SelectorComponent,
  type SelectorList,
  transform,
} from 'lightningcss';
import type { DesignSystem } from '../design-system';
import type { StyleProgram, StyleRecipe } from '../program';
import { replaceSelectorClasses } from '../selectors';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type RenderedCss =
  | { kind: 'merged'; css: string }
  | { kind: 'split'; index: string; chunks: Map<string, string> };

export interface LowerCssOptions {
  design: DesignSystem;
  program: StyleProgram;
  mode?: 'merged' | 'split' | undefined;
  base?: readonly string[] | undefined;
  configDir?: string | undefined;
  themeSelector?: string | undefined;
}

export async function lowerCss(options: LowerCssOptions): Promise<RenderedCss> {
  const mode = options.mode ?? 'merged';
  const configDir = options.configDir ?? process.cwd();
  const base = await bundleBaseCss(options.base ?? [], configDir);

  if (mode === 'merged') {
    const compiled = await options.design.compileCandidates(options.program.candidates);
    const body = lowerProgramStylesheet(compiled, options.program, options.program.recipes);
    const theme = buildThemeBlock(body, options.design.resolveThemeVar, options.themeSelector);
    return { kind: 'merged', css: joinSections(base, theme, body) };
  }

  const recipeChunks = new Map<string, StyleRecipe[]>();
  for (const recipe of options.program.recipes) {
    const chunk = recipe.chunk ?? '';
    const recipes = recipeChunks.get(chunk) ?? [];
    recipes.push(recipe);
    recipeChunks.set(chunk, recipes);
  }

  const chunks = new Map<string, string>();
  const importLines: string[] = [];
  const usedFileNames = new Set<string>();
  const compiled = await options.design.compileCandidates(options.program.candidates);

  for (const chunkName of [...recipeChunks.keys()].sort()) {
    const recipes = recipeChunks.get(chunkName)!;
    const fileName = chunkCssFileName(chunkName, usedFileNames);
    chunks.set(fileName, lowerRecipes(compiled, options.program, recipes));
    importLines.push(`@import "./${fileName}.css";`);
  }

  const support = joinSections(
    lowerStylesheet(compiled, options.program, [], 'prefix'),
    lowerStylesheet(compiled, options.program, [], 'suffix')
  );
  const chunkCss = [...chunks.values()].join('\n');
  const theme = buildThemeBlock(chunkCss, options.design.resolveThemeVar, options.themeSelector);
  const index = joinSections(importLines.join('\n'), base, support, theme);

  return { kind: 'split', index, chunks };
}

type Selection = 'recipes' | 'prefix' | 'suffix';

function lowerProgramStylesheet(css: string, program: StyleProgram, recipes: readonly StyleRecipe[]): string {
  return joinSections(
    lowerStylesheet(css, program, [], 'prefix'),
    lowerRecipes(css, program, recipes),
    lowerStylesheet(css, program, [], 'suffix')
  );
}

function lowerRecipes(css: string, program: StyleProgram, recipes: readonly StyleRecipe[]): string {
  return recipes
    .map((recipe) => lowerStylesheet(css, program, [recipe], 'recipes'))
    .filter(Boolean)
    .join('\n\n');
}

function lowerStylesheet(
  css: string,
  program: StyleProgram,
  recipes: readonly StyleRecipe[],
  selection: Selection
): string {
  const candidates = new Set(program.candidates);

  const result = transform({
    filename: 'tailwind.css',
    code: encoder.encode(css),
    include: Features.Nesting,
    visitor: {
      StyleSheet(stylesheet) {
        const candidateRules: { candidate: string; rule: Rule }[] = [];
        const prefix: Rule[] = [];
        const suffix: Rule[] = [];
        let foundCandidate = false;

        for (const rule of stylesheet.rules) {
          const candidate = candidateForRule(rule, candidates);
          if (candidate) {
            foundCandidate = true;
            candidateRules.push({ candidate, rule });
          } else if (foundCandidate) {
            suffix.push(rule);
          } else {
            prefix.push(rule);
          }
        }

        const rules: Rule[] = [];
        if (selection === 'prefix') rules.push(...prefix);

        if (selection === 'recipes') {
          for (const recipe of recipes) {
            const recipeCandidates = new Set(recipe.candidates);
            for (const entry of candidateRules) {
              if (!recipeCandidates.has(entry.candidate)) continue;
              const replacements = new Map(recipe.scaffoldClassReplacements);
              replacements.set(entry.candidate, recipe.className);
              rules.push(rewriteRuleClasses(entry.rule, replacements));
            }
          }
        }

        if (selection === 'suffix') rules.push(...suffix);
        return withoutNullValues({
          ...stylesheet,
          rules,
          licenseComments: selection === 'prefix' ? stylesheet.licenseComments : [],
        });
      },
    },
  });

  return optimizeCss(decoder.decode(result.code).trim());
}

function optimizeCss(css: string): string {
  if (!css) return '';
  return decoder
    .decode(
      transform({
        filename: 'lowered.css',
        code: encoder.encode(css),
        visitor: {
          Rule: {
            style(rule) {
              const clone = JSON.parse(JSON.stringify(rule)) as typeof rule;
              removeExactDuplicateDeclarations(clone.value.declarations);
              return withoutNullValues(clone);
            },
          },
        },
      }).code
    )
    .trim();
}

function removeExactDuplicateDeclarations(block: DeclarationBlock): void {
  if (block.declarations) block.declarations = keepLastExactDeclaration(block.declarations);
  if (block.importantDeclarations) {
    block.importantDeclarations = keepLastExactDeclaration(block.importantDeclarations);
  }
}

function keepLastExactDeclaration(declarations: Declaration[]): Declaration[] {
  const seen = new Set<string>();
  const output: Declaration[] = [];
  for (let index = declarations.length - 1; index >= 0; index--) {
    const declaration = declarations[index]!;
    const key = JSON.stringify(declaration);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(declaration);
  }
  return output.reverse();
}

function candidateForRule(rule: Rule, candidates: ReadonlySet<string>): string | undefined {
  if (rule.type !== 'style') return undefined;
  for (const selector of rule.value.selectors) {
    const candidate = candidateForSelector(selector, candidates);
    if (candidate) return candidate;
  }
  return undefined;
}

function candidateForSelector(selector: Selector, candidates: ReadonlySet<string>): string | undefined {
  for (const component of selector) {
    if (component.type === 'class' && candidates.has(component.name)) return component.name;
    for (const nested of selectorLists(component)) {
      const candidate = candidateForSelector(nested, candidates);
      if (candidate) return candidate;
    }
  }
  return undefined;
}

function rewriteRuleClasses(rule: Rule, replacements: ReadonlyMap<string, string>): Rule {
  const clone = JSON.parse(JSON.stringify(rule)) as Rule;
  rewriteRuleClassesInPlace(clone, replacements);
  return clone;
}

/** Lightning CSS serializes optional AST fields as `null`, but its returned-AST
 * deserializer accepts them only when omitted. Normalize before returning a
 * rewritten stylesheet to the Rust transform. */
function withoutNullValues<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutNullValues) as T;
  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] === null) delete record[key];
    else record[key] = withoutNullValues(record[key]);
  }
  return value;
}

function rewriteRuleClassesInPlace(rule: Rule, replacements: ReadonlyMap<string, string>): void {
  switch (rule.type) {
    case 'style':
      rewriteStyleRuleClassesInPlace(rule.value, replacements);
      return;
    case 'nesting':
      rewriteStyleRuleClassesInPlace(rule.value.style, replacements);
      return;
    case 'media':
    case 'container':
    case 'supports':
    case 'layer-block':
    case 'moz-document':
    case 'scope':
    case 'starting-style':
      for (const child of rule.value.rules) rewriteRuleClassesInPlace(child, replacements);
      return;
    default:
      return;
  }
}

function rewriteStyleRuleClassesInPlace(
  rule: Extract<Rule, { type: 'style' }>['value'],
  replacements: ReadonlyMap<string, string>
): void {
  rule.selectors = replaceSelectorClasses(rule.selectors, replacements);
  for (const child of rule.rules ?? []) rewriteRuleClassesInPlace(child, replacements);
}

function selectorLists(component: SelectorComponent): readonly Selector[] {
  if (!('selectors' in component) || !component.selectors) return [];
  const selectors = component.selectors;
  return Array.isArray(selectors[0]) ? (selectors as SelectorList) : [selectors as Selector];
}

function buildThemeBlock(
  css: string,
  resolveThemeVar: (name: string) => string | undefined,
  themeSelector: string | undefined
): string {
  const defined = collectDefinedVars(css);
  const resolved = new Map<string, string>();
  const queue = [...collectReferencedVars(css)].filter((name) => !defined.has(name));

  while (queue.length > 0) {
    const name = queue.shift()!;
    if (resolved.has(name) || defined.has(name)) continue;
    const value = resolveThemeVar(name);
    if (value === undefined) continue;
    resolved.set(name, value);
    for (const ref of collectReferencedVars(value)) {
      if (!resolved.has(ref) && !defined.has(ref)) queue.push(ref);
    }
  }

  if (resolved.size === 0) return '';

  const declarations = [...resolved.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `${themeSelector ?? ':root'} {\n${declarations}\n}`;
}

function collectReferencedVars(css: string): Set<string> {
  const variables = new Set<string>();
  const pattern = /var\(\s*(--[A-Za-z0-9_-]+)/g;
  let match = pattern.exec(css);
  while (match) {
    variables.add(match[1]!);
    match = pattern.exec(css);
  }
  return variables;
}

function collectDefinedVars(css: string): Set<string> {
  const variables = new Set<string>();
  const pattern = /(?:^|[{;\s])(--[A-Za-z0-9_-]+)\s*:/g;
  let match = pattern.exec(css);
  while (match) {
    variables.add(match[1]!);
    match = pattern.exec(css);
  }
  return variables;
}

async function bundleBaseCss(paths: readonly string[], configDir: string): Promise<string> {
  const output: string[] = [];
  for (const path of paths) {
    const filename = isAbsolute(path) ? path : resolve(configDir, path);
    const result = await bundleAsync({ filename });
    output.push(decoder.decode(result.code).trim());
  }
  return output.join('\n\n');
}

function chunkCssFileName(chunkName: string, used: Set<string>): string {
  const base = sanitizeChunkName(chunkName);
  let fileName = base;
  let suffix = 2;
  while (used.has(fileName)) fileName = `${base}-${suffix++}`;
  used.add(fileName);
  return fileName;
}

function sanitizeChunkName(chunkName: string): string {
  const safe = chunkName
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const fileName = safe || '_default';
  return fileName === 'index' ? '_index' : fileName;
}

function joinSections(...sections: readonly string[]): string {
  return sections.filter(Boolean).join('\n\n');
}
