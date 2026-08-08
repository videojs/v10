import { isAbsolute, resolve } from 'node:path';
import {
  bundleAsync,
  type Declaration,
  type DeclarationBlock,
  Features,
  type Rule,
  type StyleSheet,
  type TokenOrValue,
  transform,
} from 'lightningcss';
import { DiagnosticError } from '../../diagnostics';
import type { DesignSystem } from '../design-system';
import type { StyleChunk, StyleProgramSnapshot, StyleRecipe } from '../program';
import { replaceSelectorClasses } from '../selectors';
import { cloneCssAst, collectRuleClasses, withoutNullValues } from './ast';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EmittedProgramCss =
  | { kind: 'merged'; css: string }
  | { kind: 'separate'; css: string; support: string }
  | { kind: 'split'; index: string; chunks: Map<string, string> };

export interface EmitProgramCssOptions {
  design: DesignSystem;
  program: StyleProgramSnapshot;
  mode?: 'merged' | 'split' | undefined;
  base?: readonly string[] | undefined;
  configDir?: string | undefined;
  themeSelector?: string | undefined;
  support?: 'inline' | 'separate' | undefined;
  tailwindVariables?: 'preserve' | 'inline' | undefined;
}

export async function emitProgramCss(options: EmitProgramCssOptions): Promise<EmittedProgramCss> {
  const mode = options.mode ?? 'merged';
  const configDir = options.configDir ?? process.cwd();
  const base = await bundleBaseCss(options.base ?? [], configDir);
  const compiled = await options.design.compileCandidates(options.program.candidates);
  const stylesheet = analyzeCompiledStylesheet(compiled, options.program, options.tailwindVariables === 'inline');

  if (mode === 'merged') {
    const recipes = emitRecipes(stylesheet, options.program, options.program.chunks);
    const theme = buildThemeBlock(recipes, options.design.resolveThemeVar, options.themeSelector);
    if (options.support === 'separate') {
      const support = joinSections(
        emitStylesheetSection(stylesheet, options.program, [], 'prefix'),
        base,
        theme,
        emitStylesheetSection(stylesheet, options.program, [], 'suffix')
      );
      return { kind: 'separate', css: recipes, support };
    }
    return {
      kind: 'merged',
      css: joinSections(
        base,
        theme,
        emitStylesheetSection(stylesheet, options.program, [], 'prefix'),
        recipes,
        emitStylesheetSection(stylesheet, options.program, [], 'suffix')
      ),
    };
  }

  const chunks = new Map<string, string>();
  const importLines: string[] = [];
  const usedFileNames = new Set<string>();
  for (const chunk of [...options.program.chunks].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))) {
    const chunkName = chunk.name ?? '';
    const fileName = chunkCssFileName(chunkName, usedFileNames);
    chunks.set(fileName, emitRecipes(stylesheet, options.program, [chunk]));
    importLines.push(`@import "./${fileName}.css";`);
  }

  const support = joinSections(
    emitStylesheetSection(stylesheet, options.program, [], 'prefix'),
    emitStylesheetSection(stylesheet, options.program, [], 'suffix')
  );
  const chunkCss = [...chunks.values()].join('\n');
  const theme = buildThemeBlock(chunkCss, options.design.resolveThemeVar, options.themeSelector);
  const index = joinSections(importLines.join('\n'), base, support, theme);

  return { kind: 'split', index, chunks };
}

type Selection = 'recipes' | 'prefix' | 'suffix';

interface CandidateRule {
  candidate: string;
  rule: Rule;
}

interface AnalyzedStylesheet {
  template: StyleSheet;
  candidateRules: readonly CandidateRule[];
  prefix: readonly Rule[];
  suffix: readonly Rule[];
  inlineTailwindVariables: boolean;
  tailwindDefaults: ReadonlyMap<string, readonly TokenOrValue[]>;
}

interface ChunkRecipe {
  chunk: StyleChunk;
  recipe: StyleRecipe;
}

function emitRecipes(
  stylesheet: AnalyzedStylesheet,
  program: StyleProgramSnapshot,
  chunks: readonly StyleChunk[]
): string {
  return (
    chunks
      .flatMap((chunk) => chunk.recipes.map((recipe) => ({ chunk, recipe })))
      // Module collection may be concurrent (for example, through a bundler).
      // Public class names provide a stable output order independent of load order.
      .sort(
        (a, b) =>
          (a.chunk.name ?? '').localeCompare(b.chunk.name ?? '') || a.recipe.className.localeCompare(b.recipe.className)
      )
      // Lightning CSS combines unrelated selectors with matching declarations,
      // so readable source output serializes each semantic target independently.
      .map((recipe) => emitStylesheetSection(stylesheet, program, [recipe], 'recipes'))
      .filter(Boolean)
      .join('\n\n')
  );
}

function emitStylesheetSection(
  stylesheet: AnalyzedStylesheet,
  program: StyleProgramSnapshot,
  recipes: readonly ChunkRecipe[],
  selection: Selection
): string {
  const rules: Rule[] = [];
  if (selection === 'prefix') rules.push(...stylesheet.prefix.map(cloneCssAst));

  if (selection === 'recipes') {
    const candidates = new Set(program.candidates);
    for (const { chunk, recipe } of recipes) {
      const recipeCandidates = new Set(recipe.candidates);
      for (const entry of stylesheet.candidateRules) {
        if (!recipeCandidates.has(entry.candidate)) continue;
        const replacements = new Map(chunk.groupPeerBindings);
        replacements.set(entry.candidate, recipe.className);
        const rewritten = rewriteRuleClasses(entry.rule, replacements);
        assertNoCandidateClasses(rewritten, candidates, recipe.className);
        rules.push(rewritten);
      }
    }
  }

  if (selection === 'suffix') rules.push(...stylesheet.suffix.map(cloneCssAst));
  const css = emitRuleSet(stylesheet.template, rules, selection === 'prefix');
  return stylesheet.inlineTailwindVariables ? inlinePrivateTailwindVariables(css, stylesheet.tailwindDefaults) : css;
}

function analyzeCompiledStylesheet(
  css: string,
  program: StyleProgramSnapshot,
  inlineTailwindVariables: boolean
): AnalyzedStylesheet {
  const candidates = new Set(program.candidates);
  let analyzed: AnalyzedStylesheet | undefined;

  transform({
    filename: 'tailwind.css',
    code: encoder.encode(css),
    include: Features.Nesting,
    visitor: {
      StyleSheet(stylesheet) {
        const candidateRules: CandidateRule[] = [];
        const prefix: Rule[] = [];
        const suffix: Rule[] = [];
        let section: 'prefix' | 'candidates' | 'suffix' = 'prefix';

        for (const rule of stylesheet.rules) {
          const anchors = candidateAnchorsForRule(rule, candidates);
          if (anchors.size > 1) {
            throw new DiagnosticError(
              `style emission: Tailwind produced a rule with multiple utility anchors: ${[...anchors].join(', ')}`,
              { diagnosticCode: 'style-multiple-candidate-anchors' }
            );
          }

          const candidate = anchors.values().next().value as string | undefined;
          if (candidate) {
            if (section === 'suffix') {
              throw new DiagnosticError(
                `style emission: Tailwind interleaved support CSS between candidate rules near '${candidate}'.`,
                { diagnosticCode: 'style-interleaved-support' }
              );
            }
            section = 'candidates';
            candidateRules.push({ candidate, rule: cloneCssAst(rule) });
          } else if (section === 'prefix') {
            prefix.push(cloneCssAst(rule));
          } else {
            section = 'suffix';
            suffix.push(cloneCssAst(rule));
          }
        }

        analyzed = {
          template: cloneCssAst(stylesheet),
          candidateRules,
          prefix,
          suffix,
          inlineTailwindVariables,
          tailwindDefaults: collectTailwindDefaults(stylesheet.rules),
        };
        return withoutNullValues({ ...stylesheet, rules: [] });
      },
    },
  });

  if (!analyzed) throw new Error('Lightning CSS did not return a stylesheet during style emission.');
  return analyzed;
}

function emitRuleSet(template: StyleSheet, rules: readonly Rule[], includeLicense: boolean): string {
  if (rules.length === 0 && !includeLicense) return '';
  const result = transform({
    filename: 'emitted.css',
    code: encoder.encode(''),
    include: Features.Nesting,
    visitor: {
      StyleSheet() {
        return withoutNullValues({
          ...cloneCssAst(template),
          rules: rules.map(cloneCssAst),
          licenseComments: includeLicense ? template.licenseComments : [],
        });
      },
    },
  });
  return optimizeCss(decoder.decode(result.code).trim());
}

function collectTailwindDefaults(rules: readonly Rule[]): Map<string, readonly TokenOrValue[]> {
  const defaults = new Map<string, readonly TokenOrValue[]>();
  visitRules(rules, (rule) => {
    if (rule.type !== 'property' || !rule.value.name.startsWith('--tw-')) return;
    const initial = rule.value.initialValue;
    if (initial?.type === 'token-list') defaults.set(rule.value.name, cloneCssAst(initial.value));
  });
  return defaults;
}

function collectTailwindSetters(rules: readonly Rule[]): Set<string> {
  const setters = new Set<string>();
  visitRules(rules, (rule) => {
    const block =
      rule.type === 'style' ? rule.value.declarations : rule.type === 'nesting' ? rule.value.style.declarations : null;
    if (!block) return;
    for (const declaration of [...(block.declarations ?? []), ...(block.importantDeclarations ?? [])]) {
      if (declaration.property === 'custom' && declaration.value.name.startsWith('--tw-')) {
        setters.add(declaration.value.name);
      }
    }
  });
  return setters;
}

function inlinePrivateTailwindVariables(css: string, defaults: ReadonlyMap<string, readonly TokenOrValue[]>): string {
  if (!css) return '';
  const result = transform({
    filename: 'emitted.css',
    code: encoder.encode(css),
    include: Features.Nesting,
    visitor: {
      StyleSheet(stylesheet) {
        const setters = collectTailwindSetters(stylesheet.rules);
        return withoutNullValues({
          ...cloneCssAst(stylesheet),
          rules: inlineTailwindRules(stylesheet.rules, defaults, setters),
          licenseComments: [],
        });
      },
    },
  });
  const output = decoder.decode(result.code).trim();
  assertNoPrivateTailwindVariables(output);
  return output;
}

function inlineTailwindRules(
  rules: readonly Rule[],
  defaults: ReadonlyMap<string, readonly TokenOrValue[]>,
  setters: ReadonlySet<string>
): Rule[] {
  const output: Rule[] = [];
  for (const source of rules) {
    if (source.type === 'property' && source.value.name.startsWith('--tw-')) continue;
    if (
      source.type === 'layer-statement' &&
      source.value.names.every((name) => name.length === 1 && name[0] === 'properties')
    ) {
      continue;
    }
    const rule = cloneCssAst(source);

    if (rule.type === 'style') {
      inlineTailwindDeclarationBlock(rule.value.declarations, defaults, setters);
      if (rule.value.rules) rule.value.rules = inlineTailwindRules(rule.value.rules, defaults, setters);
      if (isEmptyStyleRule(rule.value.declarations, rule.value.rules)) continue;
    } else if (rule.type === 'nesting') {
      inlineTailwindDeclarationBlock(rule.value.style.declarations, defaults, setters);
      if (rule.value.style.rules)
        rule.value.style.rules = inlineTailwindRules(rule.value.style.rules, defaults, setters);
      if (isEmptyStyleRule(rule.value.style.declarations, rule.value.style.rules)) continue;
    } else if (hasNestedRules(rule)) {
      rule.value.rules = inlineTailwindRules(rule.value.rules, defaults, setters);
      if (rule.value.rules.length === 0) continue;
    }

    output.push(rule);
  }
  return output;
}

function inlineTailwindDeclarationBlock(
  block: DeclarationBlock | undefined,
  defaults: ReadonlyMap<string, readonly TokenOrValue[]>,
  setters: ReadonlySet<string>
): void {
  if (!block) return;
  const environment = new Map<string, readonly TokenOrValue[]>(defaults);
  for (const declaration of [...(block.declarations ?? []), ...(block.importantDeclarations ?? [])]) {
    if (declaration.property === 'custom' && declaration.value.name.startsWith('--tw-')) {
      environment.set(declaration.value.name, declaration.value.value);
    }
  }
  block.declarations = inlineTailwindDeclarations(block.declarations ?? [], environment, setters);
  block.importantDeclarations = inlineTailwindDeclarations(block.importantDeclarations ?? [], environment, setters);
}

function inlineTailwindDeclarations(
  declarations: readonly Declaration[],
  environment: ReadonlyMap<string, readonly TokenOrValue[]>,
  setters: ReadonlySet<string>
): Declaration[] {
  const output: Declaration[] = [];
  for (const source of declarations) {
    if (source.property === 'custom' && source.value.name.startsWith('--tw-')) continue;
    const declaration = cloneCssAst(source);
    if (declaration.property === 'custom' || declaration.property === 'unparsed') {
      declaration.value.value = resolveTailwindTokens(declaration.value.value, environment, setters, []);
    } else if (JSON.stringify(declaration).includes('--tw-')) {
      throw new DiagnosticError(
        `style emission: cannot inline Tailwind variables in parsed declaration '${declaration.property}'.`,
        { diagnosticCode: 'style-tailwind-variable-unsupported' }
      );
    }
    output.push(declaration);
  }
  return output;
}

function resolveTailwindTokens(
  tokens: readonly TokenOrValue[],
  environment: ReadonlyMap<string, readonly TokenOrValue[]>,
  setters: ReadonlySet<string>,
  stack: readonly string[]
): TokenOrValue[] {
  const output: TokenOrValue[] = [];
  for (const source of tokens) {
    const token = cloneCssAst(source);
    if (token.type === 'var') {
      const name = token.value.name.ident;
      if (name.startsWith('--tw-')) {
        if (stack.includes(name)) {
          throw new DiagnosticError(`style emission: Tailwind variable cycle: ${[...stack, name].join(' -> ')}.`, {
            diagnosticCode: 'style-tailwind-variable-cycle',
          });
        }
        const local = environment.get(name);
        if (!local && setters.has(name)) {
          throw new DiagnosticError(
            `style emission: Tailwind variable '${name}' is set by another rule and cannot be safely inlined.`,
            { diagnosticCode: 'style-tailwind-variable-cross-rule' }
          );
        }
        const replacement = local ?? token.value.fallback;
        if (replacement == null) {
          throw new DiagnosticError(`style emission: cannot resolve Tailwind variable '${name}'.`, {
            diagnosticCode: 'style-tailwind-variable-unresolved',
          });
        }
        output.push(...resolveTailwindTokens(replacement, environment, setters, [...stack, name]));
        continue;
      }
      if (token.value.fallback) {
        token.value.fallback = resolveTailwindTokens(token.value.fallback, environment, setters, stack);
      }
    } else if (token.type === 'function') {
      token.value.arguments = resolveTailwindTokens(token.value.arguments, environment, setters, stack);
    }
    output.push(token);
  }
  return normalizeTokenWhitespace(output);
}

function normalizeTokenWhitespace(tokens: readonly TokenOrValue[]): TokenOrValue[] {
  const output: TokenOrValue[] = [];
  for (const token of tokens) {
    if (isWhitespaceToken(token) && (output.length === 0 || isWhitespaceToken(output.at(-1)))) continue;
    output.push(token);
  }
  if (isWhitespaceToken(output.at(-1))) output.pop();
  return output;
}

function isWhitespaceToken(token: TokenOrValue | undefined): boolean {
  return token?.type === 'token' && token.value.type === 'white-space';
}

function assertNoPrivateTailwindVariables(css: string): void {
  if (!css.includes('--tw-')) return;
  const names = new Set<string>();
  transform({
    filename: 'emitted.css',
    code: encoder.encode(css),
    visitor: {
      Variable(variable) {
        if (variable.name.ident.startsWith('--tw-')) names.add(variable.name.ident);
      },
      Declaration: {
        custom(declaration) {
          if (declaration.name.startsWith('--tw-')) names.add(declaration.name);
        },
      },
      Rule: {
        property(rule) {
          if (rule.value.name.startsWith('--tw-')) names.add(rule.value.name);
        },
      },
    },
  });
  if (names.size === 0) return;
  throw new DiagnosticError(
    `style emission: Tailwind variables leaked into inline output: ${[...names].sort().join(', ')}.`,
    {
      diagnosticCode: 'style-tailwind-variable-leak',
    }
  );
}

function isEmptyStyleRule(block: DeclarationBlock | undefined, rules: readonly Rule[] | undefined): boolean {
  return (
    (block?.declarations?.length ?? 0) === 0 &&
    (block?.importantDeclarations?.length ?? 0) === 0 &&
    (rules?.length ?? 0) === 0
  );
}

function hasNestedRules(
  rule: Rule
): rule is Extract<
  Rule,
  { type: 'media' | 'container' | 'supports' | 'layer-block' | 'moz-document' | 'scope' | 'starting-style' }
> {
  return (
    rule.type === 'media' ||
    rule.type === 'container' ||
    rule.type === 'supports' ||
    rule.type === 'layer-block' ||
    rule.type === 'moz-document' ||
    rule.type === 'scope' ||
    rule.type === 'starting-style'
  );
}

function visitRules(rules: readonly Rule[], visit: (rule: Rule) => void): void {
  for (const rule of rules) {
    visit(rule);
    if (rule.type === 'style') visitRules(rule.value.rules ?? [], visit);
    else if (rule.type === 'nesting') visitRules(rule.value.style.rules ?? [], visit);
    else if (hasNestedRules(rule)) visitRules(rule.value.rules, visit);
  }
}

function optimizeCss(css: string): string {
  if (!css) return '';
  return decoder
    .decode(
      transform({
        filename: 'emitted.css',
        code: encoder.encode(css),
        visitor: {
          Rule: {
            style(rule) {
              const clone = cloneCssAst(rule);
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

function candidateAnchorsForRule(rule: Rule, candidates: ReadonlySet<string>): Set<string> {
  const classes = collectRuleClasses(rule, new Set());
  return new Set([...classes].filter((className) => candidates.has(className)));
}

function assertNoCandidateClasses(rule: Rule, candidates: ReadonlySet<string>, className: string): void {
  const remaining = candidateAnchorsForRule(rule, candidates);
  // Generic bare-element naming may intentionally choose the original single
  // utility as its target. Configured semantic outputs use a distinct prefix.
  remaining.delete(className);
  if (remaining.size === 0) return;
  throw new DiagnosticError(
    `style emission: atomic utility classes leaked while emitting '.${className}': ${[...remaining].join(', ')}`,
    { diagnosticCode: 'style-candidate-leak' }
  );
}

function rewriteRuleClasses(rule: Rule, replacements: ReadonlyMap<string, string>): Rule {
  const clone = cloneCssAst(rule);
  rewriteRuleClassesInPlace(clone, replacements);
  return clone;
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

function buildThemeBlock(
  css: string,
  resolveThemeVar: (name: string) => string | undefined,
  themeSelector: string | undefined
): string {
  const usage = collectCssVariables(css);
  const defined = usage.defined;
  const resolved = new Map<string, string>();
  const queue = [...usage.referenced].filter((name) => !defined.has(name));

  while (queue.length > 0) {
    const name = queue.shift()!;
    if (resolved.has(name) || defined.has(name)) continue;
    const value = resolveThemeVar(name);
    if (value === undefined) continue;
    resolved.set(name, value);
    for (const ref of collectCssVariables(`:root { --theme-value: ${value}; }`).referenced) {
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

function collectCssVariables(css: string): { referenced: Set<string>; defined: Set<string> } {
  const referenced = new Set<string>();
  const defined = new Set<string>();
  transform({
    filename: 'variables.css',
    code: encoder.encode(css),
    visitor: {
      Variable(variable) {
        referenced.add(variable.name.ident);
      },
      Declaration: {
        custom(declaration) {
          if (declaration.name.startsWith('--')) defined.add(declaration.name);
        },
      },
    },
  });
  return { referenced, defined };
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
