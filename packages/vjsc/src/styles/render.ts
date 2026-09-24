import {
  Features,
  type Rule,
  type Selector,
  type SelectorComponent,
  type SelectorList,
  type StyleSheet,
  type TokenOrValue,
  transform,
} from 'lightningcss';

import { cloneCssAst, collectRuleClasses, hasNestedCssRules, withoutNullValues } from './css-ast';
import type { DesignSystem } from './design-system';
import type { StyleOutputFile } from './output';
import { replaceRuleClasses } from './selectors';
import {
  collectTailwindDefaults,
  dedupeRuleDeclarations,
  inlinePrivateTailwindVariables,
  optimizeSemanticCss,
} from './tailwind-values';

const encoder = new TextEncoder();

const decoder = new TextDecoder();

interface RenderStylesheetsOptions {
  design: DesignSystem;
  scope?: string | undefined;
  files: readonly StyleOutputFile[];
}

/**
 * Declared first in every semantic rule so Tailwind keeps variant output nested under the rule. Without a declaration
 * of its own, Tailwind hoists nested rules out as flat selectors and leaves no semantic root to recover.
 */
const ROOT_SENTINEL = '--vjsc-root';

export async function renderStylesheets(options: RenderStylesheetsOptions): Promise<Map<string, string>> {
  const analyzedFiles = new Map<StyleOutputFile, AnalyzedFile>();

  for (const file of options.files) {
    const source = file.rules
      .map((rule) => `.${rule.className} {\n  ${ROOT_SENTINEL}: 0;\n  @apply ${rule.candidates.join(' ')};\n}`)
      .join('\n');

    analyzedFiles.set(file, analyzeCompiledFile(await options.design.compileCss(source), file));
  }

  const files = new Map<string, string>();

  for (const file of options.files) {
    const analyzed = analyzedFiles.get(file);
    if (!analyzed) throw new Error(`Style output '${file.name}' was not compiled.`);

    files.set(file.name, wrapFileCss(renderFile(analyzed, file), options.scope, file));
  }

  return files;
}

/**
 * Wrap a file's rules in its layer and scope them under `:where(<scope>)`, which adds no specificity and, unlike
 * `@scope`, reaches every supported browser. Scope proximity is lost, so a component nested inside itself resolves by
 * source order.
 */
function wrapFileCss(css: string, scope: string | undefined, file: StyleOutputFile): string {
  const relationshipOwners = new Set(file.groupOwners.values());
  const scopeRootClasses = new Set(file.rules.filter((rule) => rule.scopeRoot).map((rule) => rule.className));
  const root = scope ? where(parseSelectorList(scope)) : undefined;
  const split = root ? splitSlottedRules(css) : { scoped: css, unscoped: '' };
  const wrapped = `@layer ${file.layer} {\n${split.scoped}\n${split.unscoped}\n}`;

  return optimizeSemanticCss(
    decoder.decode(
      transform({
        filename: 'scoped.css',
        code: encoder.encode(wrapped),
        visitor: {
          Rule: {
            style(rule) {
              if (!root || isSlottedStyleRule(rule)) return;

              if ((rule.value.rules ?? []).length > 0) {
                throw new Error(`Style output '${file.name}' has a nested rule the scope would prefix twice.`);
              }

              const selectors =
                relationshipSelectors(rule.value.selectors, root, relationshipOwners, scopeRootClasses) ??
                rule.value.selectors.flatMap((selector) => scopedSelectors(selector, root, scopeRootClasses));

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

/** Slotted nodes sit outside a shadow tree's CSS scope, so their rules follow the scoped ones, unprefixed. */
function splitSlottedRules(css: string) {
  let hasSlottedRules = false;
  const scoped = filterCssRules(css, (rule) => {
    const slotted = isSlottedStyleRule(rule);

    hasSlottedRules ||= slotted;
    return !slotted;
  });

  return { scoped, unscoped: hasSlottedRules ? filterCssRules(css, isSlottedStyleRule) : '' };
}

function filterCssRules(css: string, include: (rule: Rule) => boolean): string {
  return decoder.decode(
    transform({
      filename: 'semantic.css',
      code: encoder.encode(css),
      visitor: {
        StyleSheet(stylesheet) {
          return withoutNullValues({
            ...cloneCssAst(stylesheet),
            rules: filterNestedRules(stylesheet.rules, include),
          });
        },
      },
    }).code
  );
}

function filterNestedRules(rules: readonly Rule[], include: (rule: Rule) => boolean): Rule[] {
  const filtered: Rule[] = [];

  for (const rule of rules) {
    if (hasNestedCssRules(rule)) {
      const nested = filterNestedRules(rule.value.rules, include);

      if (nested.length > 0) {
        const cloned = cloneCssAst(rule);

        cloned.value.rules = nested;
        filtered.push(withoutNullValues(cloned));
      }

      continue;
    }

    if (include(rule)) filtered.push(cloneCssAst(rule));
  }

  return filtered;
}

function isSlottedStyleRule(rule: Rule): boolean {
  return (
    rule.type === 'style' &&
    rule.value.selectors.some((selector) =>
      selector.some((component) => component.type === 'pseudo-element' && component.kind === 'slotted')
    )
  );
}

/** A selector under the scope root, plus one on the root itself when its semantic class is colocated there. */
function scopedSelectors(selector: Selector, root: WhereComponent, scopeRootClasses: ReadonlySet<string>): Selector[] {
  const descendant: Selector =
    selector[0]?.type === 'combinator'
      ? [cloneCssAst(root), ...selector.map(cloneCssAst)]
      : [cloneCssAst(root), { type: 'combinator', value: 'descendant' }, ...selector.map(cloneCssAst)];

  if (selector[0]?.type !== 'class' || !scopeRootClasses.has(selector[0].name)) return [descendant];

  return [descendant, [cloneCssAst(root), ...selector.map(cloneCssAst)]];
}

/**
 * Selectors for a rule whose every selector starts at the same relationship owner, such as a `group/*` parent. The
 * owner is matched inside the scope root, or on the root itself when it is a scope root class.
 */
function relationshipSelectors(
  selectors: SelectorList,
  root: WhereComponent,
  relationshipOwners: ReadonlySet<string>,
  scopeRootClasses: ReadonlySet<string>
): SelectorList | undefined {
  const relationships = selectors.map((selector) => scopedRelationship(selector, relationshipOwners));
  const owner = relationships[0]?.owner;
  if (!owner || relationships.some((relationship) => relationship?.owner !== owner)) return;

  const ownerRoot = where(scopedSelectors([{ type: 'class', name: owner }], root, scopeRootClasses));

  return relationships.map((relationship) => [cloneCssAst(ownerRoot), ...relationship!.rest]);
}

function scopedRelationship(
  selector: Selector,
  relationshipOwners: ReadonlySet<string>
): { owner: string; rest: Selector } | undefined {
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

  return { owner: owner.selectors[0][0].name, rest: selector.slice(1).map(cloneCssAst) };
}

type WhereComponent = Extract<SelectorComponent, { type: 'pseudo-class'; kind: 'where' }>;

function where(selectors: SelectorList): WhereComponent {
  return { type: 'pseudo-class', kind: 'where', selectors };
}

function parseSelectorList(selector: string): SelectorList {
  let selectors: SelectorList | undefined;

  transform({
    filename: 'scope.css',
    code: encoder.encode(`${selector} {}`),
    visitor: {
      Rule: {
        style(rule) {
          selectors = cloneCssAst(rule.value.selectors);
        },
      },
    },
  });

  if (!selectors) throw new Error(`Style scope \`${selector}\` is not a selector list.`);

  return selectors;
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

          semanticRules.set(className, withoutRootSentinel(cloneCssAst(rule)));
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

function withoutRootSentinel(rule: Rule): Rule {
  if (rule.type !== 'style') return rule;

  const block = rule.value.declarations;

  if (block?.declarations) {
    block.declarations = block.declarations.filter(
      (declaration) => declaration.property !== 'custom' || declaration.value.name !== ROOT_SENTINEL
    );
  }

  return rule;
}

function semanticRootClass(rule: Rule, semanticClassNames: ReadonlySet<string>): string | undefined {
  if (rule.type !== 'style' || rule.value.selectors.length !== 1) return;

  const selector = rule.value.selectors[0];
  if (selector?.length !== 1 || selector[0]?.type !== 'class') return;

  return semanticClassNames.has(selector[0].name) ? selector[0].name : undefined;
}

function renderRuleSet(template: StyleSheet, rules: readonly Rule[]): string {
  const cloned = rules.map(cloneCssAst);

  dedupeRuleDeclarations(cloned);

  const result = transform({
    filename: 'rendered.css',
    code: encoder.encode(''),
    include: Features.Nesting,
    visitor: {
      StyleSheet() {
        return withoutNullValues({
          ...cloneCssAst(template),
          rules: cloned,
          licenseComments: [],
        });
      },
    },
  });

  return decoder.decode(result.code).trim();
}

function assertNoRelationshipMarkers(rule: Rule, bindings: ReadonlyMap<string, string>): void {
  const remaining = [...collectRuleClasses(rule, new Set())].filter((className) => bindings.has(className));
  if (remaining.length === 0) return;

  throw new Error(`style emission: relationship markers leaked into semantic CSS: ${remaining.join(', ')}`);
}
