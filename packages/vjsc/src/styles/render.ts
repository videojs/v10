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
import type { StyleOutputFile } from './output';
import { replaceRuleClasses } from './selectors';
import { collectTailwindDefaults, inlinePrivateTailwindVariables, optimizeSemanticCss } from './tailwind-values';

const encoder = new TextEncoder();

const decoder = new TextDecoder();

interface RenderStylesheetsOptions {
  design: DesignSystem;
  scope?: string | undefined;
  files: readonly StyleOutputFile[];
}

export async function renderStylesheets(options: RenderStylesheetsOptions): Promise<Map<string, string>> {
  const analyzedFiles = new Map<StyleOutputFile, AnalyzedFile>();

  for (const file of options.files) {
    const source = file.rules
      .map((rule) => `.${rule.className} {\n  @apply ${rule.candidates.join(' ')};\n}`)
      .join('\n');

    analyzedFiles.set(file, analyzeCompiledFile(await options.design.compileCss(source), file));
  }

  const files = new Map<string, string>();

  for (const file of [...options.files].sort((a, b) => a.name.localeCompare(b.name))) {
    const analyzed = analyzedFiles.get(file);
    if (!analyzed) throw new Error(`Style output '${file.name}' was not compiled.`);

    files.set(file.name, wrapFileCss(renderFile(analyzed, file), options.scope, file));
  }

  return files;
}

function wrapFileCss(css: string, scope: string | undefined, file: StyleOutputFile): string {
  const relationshipOwners = new Set(file.groupOwners.values());
  const scopeRootClasses = new Set(file.rules.filter((rule) => rule.scopeRoot).map((rule) => rule.className));
  const scoped = scope ? `@scope (${scope}) {\n${css}\n}` : css;
  const wrapped = `@layer ${file.layer} {\n${scoped}\n}`;

  return optimizeSemanticCss(
    decoder.decode(
      transform({
        filename: 'scoped.css',
        code: encoder.encode(wrapped),
        visitor: {
          Rule: {
            style(rule) {
              const relationship = relationshipScope(rule, relationshipOwners);
              if (relationship) return relationship;

              if (!scope) return;

              const selectors = includeScopeRootSelectors(rule.value.selectors, scopeRootClasses);
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
  );
}

/** Include a scoped rule when its semantic class is colocated on the scope root. */
function includeScopeRootSelectors(selectors: SelectorList, scopeRootClasses: ReadonlySet<string>): SelectorList {
  return selectors.flatMap((selector) => {
    if (selector[0]?.type !== 'class' || !scopeRootClasses.has(selector[0].name)) return [selector];

    return [selector, [{ type: 'pseudo-class', kind: 'scope' } as const, ...selector.map(cloneCssAst)]];
  });
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

interface AnalyzedFile {
  template: StyleSheet;
  semanticRules: ReadonlyMap<string, Rule>;
  tailwindDefaults: ReadonlyMap<string, readonly TokenOrValue[]>;
}

function renderFile(analyzed: AnalyzedFile, file: StyleOutputFile): string {
  const relationshipOwners = file.groupOwners;
  const rules = [...file.rules]
    .sort((a, b) => a.className.localeCompare(b.className))
    .map((rule) => {
      const source = analyzed.semanticRules.get(rule.className);
      if (!source) throw new Error(`Tailwind did not emit the semantic style '.${rule.className}'.`);

      const renderedRule = replaceRuleClasses(source, relationshipOwners);

      assertNoRelationshipMarkers(renderedRule, relationshipOwners);

      return renderedRule;
    });

  return inlinePrivateTailwindVariables(renderRuleSet(analyzed.template, rules), analyzed.tailwindDefaults);
}

function analyzeCompiledFile(css: string, file: StyleOutputFile): AnalyzedFile {
  const semanticClassNames = new Set(file.rules.map((rule) => rule.className));
  let analyzed: AnalyzedFile | undefined;

  transform({
    filename: 'tailwind.css',
    code: encoder.encode(css),
    include: Features.Nesting,
    visitor: {
      StyleSheet(stylesheet) {
        const semanticRules = new Map<string, Rule>();

        for (const rule of stylesheet.rules) {
          const className = semanticRootClass(rule, semanticClassNames);
          if (!className) continue;

          if (semanticRules.has(className)) throw new Error(`Tailwind emitted '.${className}' more than once.`);

          semanticRules.set(className, cloneCssAst(rule));
        }

        analyzed = {
          template: cloneCssAst(stylesheet),
          semanticRules,
          tailwindDefaults: collectTailwindDefaults(stylesheet.rules),
        };

        return withoutNullValues({ ...stylesheet, rules: [] });
      },
    },
  });

  if (!analyzed) throw new Error('Lightning CSS did not return a stylesheet during style emission.');

  return analyzed;
}

function semanticRootClass(rule: Rule, semanticClassNames: ReadonlySet<string>): string | undefined {
  if (rule.type !== 'style' || rule.value.selectors.length !== 1) return;

  const selector = rule.value.selectors[0];
  if (selector?.length !== 1 || selector[0]?.type !== 'class') return;

  return semanticClassNames.has(selector[0].name) ? selector[0].name : undefined;
}

function renderRuleSet(template: StyleSheet, rules: readonly Rule[]): string {
  const result = transform({
    filename: 'rendered.css',
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

  throw new Error(`style emission: relationship markers leaked into semantic CSS: ${remaining.join(', ')}`);
}
