import type { DesignSystem } from './design-system';
import type { StyleOutputFile, StyleOutputRule } from './output';
import { renderStylesheets } from './render';
import {
  collectGroupOwners,
  isGroupMarker,
  type ResolvedStyles,
  type ResolvedStyleRule,
  utilitiesForRule,
} from './resolved';

export interface CompileStylesOptions {
  readonly design: DesignSystem;
  readonly styles: ResolvedStyles;
  readonly scope?: string | undefined;
  /** Ordered variant utilities to append to each rule's base utilities when defined. */
  readonly variants?: readonly string[] | undefined;
  /** Restrict CSS emission to semantic class names referenced by the compiled source graph. */
  readonly ruleClassNames?: ReadonlySet<string> | undefined;
}

/** Compiled outputs per design system, keyed by the exact rules, variants, and scope that produced them. */
const compiledStyles = new WeakMap<DesignSystem, Map<string, Promise<ReadonlyMap<string, string>>>>();

/** Compile semantic rules and group the resulting CSS by each definition's explicit output file. */
export async function compileStyles(options: CompileStylesOptions): Promise<Map<string, string>> {
  const variants = options.variants ?? [];
  const groupOwners = uniqueGroupOwners(options.styles.rules, variants);
  const selected = selectRules(options);
  const key = compileKey(options, selected, groupOwners, variants);
  const cache = compiledStyles.get(options.design) ?? new Map<string, Promise<ReadonlyMap<string, string>>>();

  compiledStyles.set(options.design, cache);

  let compiled = cache.get(key);

  if (!compiled) {
    const pending = compileSelectedStyles(options, selected, groupOwners, variants);

    cache.set(key, pending);
    pending.catch(() => {
      if (cache.get(key) === pending) cache.delete(key);
    });
    compiled = pending;
  }

  return new Map(await compiled);
}

function selectRules(options: CompileStylesOptions): ResolvedStyleRule[] {
  return [...options.styles.rules]
    .filter((rule) => !options.ruleClassNames || options.ruleClassNames.has(rule.className))
    .sort((a, b) => a.className.localeCompare(b.className));
}

/** Everything the compiled CSS depends on besides the design system itself. */
function compileKey(
  options: CompileStylesOptions,
  selected: readonly ResolvedStyleRule[],
  groupOwners: ReadonlyMap<string, string>,
  variants: readonly string[]
): string {
  return JSON.stringify([
    options.scope ?? null,
    variants,
    options.ruleClassNames ? [...options.ruleClassNames] : null,
    [...groupOwners].sort(([left], [right]) => left.localeCompare(right)),
    selected.map((rule) => [rule.className, rule.file, rule.layer, rule.scopeRoot, utilitiesForRule(rule, variants)]),
    options.ruleClassNames ? null : [...new Set(options.styles.rules.map((rule) => rule.file))].sort(),
  ]);
}

async function compileSelectedStyles(
  options: CompileStylesOptions,
  selected: readonly ResolvedStyleRule[],
  groupOwners: ReadonlyMap<string, string>,
  variants: readonly string[]
): Promise<ReadonlyMap<string, string>> {
  const byFile = new Map<string, StyleOutputFile & { rules: StyleOutputRule[] }>();

  for (const rule of selected) {
    const compiled = compileRule(rule, options.design, variants);
    if (compiled.candidates.length === 0) continue;

    const existing = byFile.get(rule.file);

    if (existing) {
      existing.rules.push(compiled);
      continue;
    }

    byFile.set(rule.file, {
      name: rule.file,
      layer: rule.layer,
      rules: [compiled],
      groupOwners,
    });
  }

  const files = orderOutputFiles([...byFile.values()], options);
  const rendered = await renderStylesheets({
    design: options.design,
    ...(options.scope ? { scope: options.scope } : {}),
    files,
  });

  const outputFiles = options.ruleClassNames
    ? files.map((file) => file.name)
    : [...new Set(options.styles.rules.map((rule) => rule.file))].sort();

  return new Map(outputFiles.map((file) => [file, rendered.get(file) ?? '']));
}

/** Order files by their first referenced class so a module's assets follow its class composition, else by name. */
function orderOutputFiles(files: readonly StyleOutputFile[], options: CompileStylesOptions): StyleOutputFile[] {
  const byName = (left: StyleOutputFile, right: StyleOutputFile) => left.name.localeCompare(right.name);

  if (!options.ruleClassNames) return [...files].sort(byName);

  const fileByClass = new Map(options.styles.rules.map((rule) => [rule.className, rule.file]));
  const positions = new Map<string, number>();

  for (const className of options.ruleClassNames) {
    const file = fileByClass.get(className);

    if (file !== undefined && !positions.has(file)) positions.set(file, positions.size);
  }

  return [...files].sort(
    (left, right) =>
      (positions.get(left.name) ?? Number.POSITIVE_INFINITY) -
        (positions.get(right.name) ?? Number.POSITIVE_INFINITY) || byName(left, right)
  );
}

function compileRule(rule: ResolvedStyleRule, design: DesignSystem, variants: readonly string[]): StyleOutputRule {
  const candidates: string[] = [];
  const unsupported: string[] = [];

  for (const utility of utilitiesForRule(rule, variants)) {
    if (isGroupMarker(utility)) continue;

    const css = design.candidateCss(utility);

    if (!css) {
      unsupported.push(utility);
      continue;
    }

    candidates.push(utility);
  }

  if (unsupported.length > 0) {
    throw new Error(
      `Style rule \`${rule.tokenPath.join('.')}\` contains unsupported utilities: ${unsupported.join(' ')}. ` +
        'Keep literal public classes in markup instead of the style definition.'
    );
  }

  return { className: rule.className, candidates, scopeRoot: rule.scopeRoot };
}

/** Each relationship marker must have exactly one owner before its consumers can be scoped to it. */
function uniqueGroupOwners(
  rules: readonly ResolvedStyleRule[],
  variants: readonly string[]
): ReadonlyMap<string, string> {
  const owners = new Map<string, string>();

  for (const [utility, classNames] of collectGroupOwners(rules, variants)) {
    if (classNames.length > 1) {
      throw new Error(
        `Style relationship marker \`${utility}\` maps to both \`${classNames[0]}\` and \`${classNames[1]}\`.`
      );
    }

    owners.set(utility, classNames[0]!);
  }

  return owners;
}
