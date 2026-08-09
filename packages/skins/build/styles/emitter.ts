import { DiagnosticError } from '@videojs/compiler';
import {
  type Declaration,
  type DeclarationBlock,
  Features,
  type Rule,
  type StyleSheet,
  type TokenOrValue,
  transform,
} from 'lightningcss';
import { validateStyleCompositions } from './composition';
import { cloneCssAst, collectRuleClasses, hasNestedCssRules, visitCssRules, withoutNullValues } from './css-ast';
import type { DesignSystem } from './design-system';
import { replaceSelectorClasses } from './selectors';
import type { SkinCssRecipe, SkinCssRole, SkinStyleSheet } from './stylesheet';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface EmitSkinRoleCssOptions {
  design: DesignSystem;
  stylesheet: SkinStyleSheet;
}

export async function emitSkinRoleCss(options: EmitSkinRoleCssOptions): Promise<Map<string, string>> {
  const compiled = await options.design.compileCandidates(options.stylesheet.candidates);
  const analyzed = analyzeCompiledStylesheet(compiled, options.stylesheet, true);
  validateStyleCompositions(options.stylesheet, (role, recipe) =>
    emitStylesheetSection(analyzed, options.stylesheet, [{ role, recipe }], 'recipes')
  );

  const support = [
    emitStylesheetSection(analyzed, options.stylesheet, [], 'prefix'),
    emitStylesheetSection(analyzed, options.stylesheet, [], 'suffix'),
  ]
    .filter(Boolean)
    .join('\n\n');
  if (support) {
    throw new Error('Skin style compilation produced unexpected global Tailwind support CSS.');
  }

  const roles = new Map<string, string>();
  for (const role of [...options.stylesheet.roles].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))) {
    if (!role.name) throw new Error('Every Skin style recipe must declare a role.');
    roles.set(role.name, emitRecipes(analyzed, options.stylesheet, [role]));
  }

  return roles;
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

interface RoleRecipe {
  role: SkinCssRole;
  recipe: SkinCssRecipe;
}

function emitRecipes(analyzed: AnalyzedStylesheet, stylesheet: SkinStyleSheet, roles: readonly SkinCssRole[]): string {
  return (
    roles
      .flatMap((role) => role.recipes.map((recipe) => ({ role, recipe })))
      // Module collection may be concurrent (for example, through a bundler).
      // Public class names provide a stable output order independent of load order.
      .sort(
        (a, b) =>
          (a.role.name ?? '').localeCompare(b.role.name ?? '') || a.recipe.className.localeCompare(b.recipe.className)
      )
      // Lightning CSS combines unrelated selectors with matching declarations,
      // so readable source output serializes each semantic target independently.
      .map((recipe) => emitStylesheetSection(analyzed, stylesheet, [recipe], 'recipes'))
      .filter(Boolean)
      .join('\n\n')
  );
}

function emitStylesheetSection(
  analyzed: AnalyzedStylesheet,
  stylesheet: SkinStyleSheet,
  recipes: readonly RoleRecipe[],
  selection: Selection
): string {
  const rules: Rule[] = [];
  if (selection === 'prefix') rules.push(...analyzed.prefix.map(cloneCssAst));

  if (selection === 'recipes') {
    for (const entry of recipes) {
      rules.push(...rulesForRecipe(analyzed, stylesheet, entry));
    }
  }

  if (selection === 'suffix') rules.push(...analyzed.suffix.map(cloneCssAst));
  const css = emitRuleSet(analyzed.template, rules, selection === 'prefix');
  return analyzed.inlineTailwindVariables ? inlinePrivateTailwindVariables(css, analyzed.tailwindDefaults) : css;
}

function rulesForRecipe(
  analyzed: AnalyzedStylesheet,
  stylesheet: SkinStyleSheet,
  { role, recipe }: RoleRecipe
): Rule[] {
  const rules: Rule[] = [];
  const candidates = new Set(stylesheet.candidates);
  const recipeCandidates = new Set(recipe.candidates);
  for (const entry of analyzed.candidateRules) {
    if (!recipeCandidates.has(entry.candidate)) continue;
    const replacements = new Map(role.groupPeerBindings);
    replacements.set(entry.candidate, recipe.className);
    const rewritten = rewriteRuleClasses(entry.rule, replacements);
    assertNoCandidateClasses(rewritten, candidates, recipe.className);
    rules.push(rewritten);
  }
  return rules;
}

function analyzeCompiledStylesheet(
  css: string,
  stylesheet: SkinStyleSheet,
  inlineTailwindVariables: boolean
): AnalyzedStylesheet {
  const candidates = new Set(stylesheet.candidates);
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
  visitCssRules(rules, (rule) => {
    if (rule.type !== 'property' || !rule.value.name.startsWith('--tw-')) return;
    const initial = rule.value.initialValue;
    if (initial?.type === 'token-list') defaults.set(rule.value.name, cloneCssAst(initial.value));
  });
  return defaults;
}

function collectTailwindSetters(rules: readonly Rule[]): Set<string> {
  const setters = new Set<string>();
  visitCssRules(rules, (rule) => {
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
    } else if (hasNestedCssRules(rule)) {
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
