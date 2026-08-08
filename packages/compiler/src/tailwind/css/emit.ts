import { isAbsolute, resolve } from 'node:path';
import {
  bundleAsync,
  type Declaration,
  type DeclarationBlock,
  Features,
  type Rule,
  type StyleSheet,
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
}

export async function emitProgramCss(options: EmitProgramCssOptions): Promise<EmittedProgramCss> {
  const mode = options.mode ?? 'merged';
  const configDir = options.configDir ?? process.cwd();
  const base = await bundleBaseCss(options.base ?? [], configDir);
  const compiled = await options.design.compileCandidates(options.program.candidates);
  const stylesheet = analyzeCompiledStylesheet(compiled, options.program);

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
      // Module collection may be concurrent (for example, through esbuild).
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
  return emitRuleSet(stylesheet.template, rules, selection === 'prefix');
}

function analyzeCompiledStylesheet(css: string, program: StyleProgramSnapshot): AnalyzedStylesheet {
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
