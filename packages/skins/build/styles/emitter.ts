import { DiagnosticError } from '@videojs/compiler';
import {
  Features,
  type Rule,
  type Selector,
  type SelectorList,
  type StyleSheet,
  type TokenOrValue,
  transform,
} from 'lightningcss';
import { cloneCssAst, collectRuleClasses, withoutNullValues } from './css-ast';
import type { DesignSystem } from './design-system';
import { replaceRuleClasses } from './selectors';
import type { SkinCssRole } from './stylesheet';
import { collectTailwindDefaults, inlinePrivateTailwindVariables, optimizeSemanticCss } from './tailwind-values';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface EmitSkinRoleCssOptions {
  design: DesignSystem;
  scopeClass: string;
  roles: readonly SkinCssRole[];
}

export async function emitSkinRoleCss(options: EmitSkinRoleCssOptions): Promise<Map<string, string>> {
  const analyzedRoles = new Map<SkinCssRole, AnalyzedRole>();
  for (const role of options.roles) {
    const source = role.recipes
      .map((recipe) => `.${recipe.className} {\n  @apply ${recipe.candidates.join(' ')};\n}`)
      .join('\n');
    analyzedRoles.set(role, analyzeCompiledRole(await options.design.compileCss(source), role));
  }

  const roles = new Map<string, string>();
  for (const role of [...options.roles].sort((a, b) => a.name.localeCompare(b.name))) {
    const analyzed = analyzedRoles.get(role);
    if (!analyzed) throw new Error(`Skin style role '${role.name}' was not compiled.`);
    roles.set(role.name, scopeRoleCss(emitRole(analyzed, role), options.scopeClass, role));
  }

  return roles;
}

function scopeRoleCss(css: string, scopeClass: string, role: SkinCssRole): string {
  const relationshipOwners = new Set(role.groupOwners.values());
  const wrapped = `@layer videojs.components {\n@scope (.${scopeClass}) {\n${css}\n}\n}`;
  return decoder
    .decode(
      transform({
        filename: 'scoped.css',
        code: encoder.encode(wrapped),
        visitor: {
          Rule: {
            style(rule) {
              const relationship = relationshipScope(rule, relationshipOwners);
              if (relationship) return relationship;

              const selectors = scopeSkinRootSelectors(rule.value.selectors);
              if (selectors === rule.value.selectors) return;
              return withoutNullValues({
                ...cloneCssAst(rule),
                value: { ...cloneCssAst(rule.value), selectors },
              });
            },
          },
        },
      }).code
    )
    .trim();
}

function scopeSkinRootSelectors(selectors: SelectorList): SelectorList {
  let changed = false;
  const scoped = selectors.map((selector) => {
    if (selector[0]?.type !== 'class' || selector[0].name !== 'media-skin') return selector;
    changed = true;
    return [{ type: 'nesting' } as const, ...selector.slice(1).map(cloneCssAst)];
  });
  return changed ? scoped : selectors;
}

function relationshipScope(
  rule: Extract<Rule, { type: 'style' }>,
  relationshipOwners: ReadonlySet<string>
): Rule | undefined {
  const relationships = rule.value.selectors.map((selector) => scopedRelationship(selector, relationshipOwners));
  const owner = relationships[0]?.owner;
  if (!owner || relationships.some((relationship) => relationship?.owner !== owner)) return;

  const style = cloneCssAst(rule);
  style.value.selectors = relationships.map((relationship) => relationship!.selector);
  return withoutNullValues({
    type: 'scope',
    value: {
      loc: cloneCssAst(rule.value.loc),
      scopeStart: [[{ type: 'class', name: owner }]],
      rules: [style],
    },
  });
}

function scopedRelationship(
  selector: Selector,
  relationshipOwners: ReadonlySet<string>
): { owner: string; selector: Selector } | undefined {
  const owner = selector[0];
  if (
    owner?.type !== 'pseudo-class' ||
    owner.kind !== 'where' ||
    owner.selectors.length !== 1 ||
    owner.selectors[0]?.length !== 1 ||
    owner.selectors[0][0]?.type !== 'class' ||
    !relationshipOwners.has(owner.selectors[0][0].name)
  ) {
    return;
  }
  const descendant = selector.findIndex(
    (component, index) => index > 0 && component.type === 'combinator' && component.value === 'descendant'
  );
  if (descendant < 0) return;
  return {
    owner: owner.selectors[0][0].name,
    selector: [{ type: 'nesting' }, ...selector.slice(1).map(cloneCssAst)],
  };
}

interface AnalyzedRole {
  template: StyleSheet;
  recipeRules: ReadonlyMap<string, Rule>;
  tailwindDefaults: ReadonlyMap<string, readonly TokenOrValue[]>;
}

function emitRole(analyzed: AnalyzedRole, role: SkinCssRole): string {
  const rules = [...role.recipes]
    .sort((a, b) => a.className.localeCompare(b.className))
    .map((recipe) => {
      const source = analyzed.recipeRules.get(recipe.className);
      if (!source) throw new Error(`Tailwind did not emit the semantic style '.${recipe.className}'.`);
      const rule = replaceRuleClasses(source, role.groupOwners);
      assertNoRelationshipMarkers(rule, role.groupOwners);
      return rule;
    });
  return inlinePrivateTailwindVariables(emitRuleSet(analyzed.template, rules), analyzed.tailwindDefaults);
}

function analyzeCompiledRole(css: string, role: SkinCssRole): AnalyzedRole {
  const recipeNames = new Set(role.recipes.map((recipe) => recipe.className));
  let analyzed: AnalyzedRole | undefined;

  transform({
    filename: 'tailwind.css',
    code: encoder.encode(css),
    include: Features.Nesting,
    visitor: {
      StyleSheet(stylesheet) {
        const recipeRules = new Map<string, Rule>();
        for (const rule of stylesheet.rules) {
          const className = semanticRootClass(rule, recipeNames);
          if (!className) continue;
          if (recipeRules.has(className)) throw new Error(`Tailwind emitted '.${className}' more than once.`);
          recipeRules.set(className, cloneCssAst(rule));
        }

        analyzed = {
          template: cloneCssAst(stylesheet),
          recipeRules,
          tailwindDefaults: collectTailwindDefaults(stylesheet.rules),
        };
        return withoutNullValues({ ...stylesheet, rules: [] });
      },
    },
  });

  if (!analyzed) throw new Error('Lightning CSS did not return a stylesheet during style emission.');
  return analyzed;
}

function semanticRootClass(rule: Rule, recipeNames: ReadonlySet<string>): string | undefined {
  if (rule.type !== 'style' || rule.value.selectors.length !== 1) return;
  const selector = rule.value.selectors[0];
  if (selector?.length !== 1 || selector[0]?.type !== 'class') return;
  return recipeNames.has(selector[0].name) ? selector[0].name : undefined;
}

function emitRuleSet(template: StyleSheet, rules: readonly Rule[]): string {
  const result = transform({
    filename: 'emitted.css',
    code: encoder.encode(''),
    include: Features.Nesting,
    visitor: {
      StyleSheet() {
        return withoutNullValues({
          ...cloneCssAst(template),
          rules: rules.map(cloneCssAst),
          licenseComments: [],
        });
      },
    },
  });
  return optimizeSemanticCss(decoder.decode(result.code).trim());
}

function assertNoRelationshipMarkers(rule: Rule, bindings: ReadonlyMap<string, string>): void {
  const remaining = [...collectRuleClasses(rule, new Set())].filter((className) => bindings.has(className));
  if (remaining.length === 0) return;
  throw new DiagnosticError(`style emission: relationship markers leaked into semantic CSS: ${remaining.join(', ')}`, {
    diagnosticCode: 'style-relationship-marker-leak',
  });
}
