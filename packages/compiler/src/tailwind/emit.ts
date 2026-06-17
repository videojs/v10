import { isAbsolute, resolve } from 'node:path';
import { bundleAsync } from 'lightningcss';
import type { Declaration, UtilityCss } from './decompose';

/** A compiled rule: a class name + the utility's declarations and variants. */
export interface CompiledRule {
  /** Final CSS class name (e.g. `play-button`). */
  className: string;
  /** Declarations + variants extracted from the utility. */
  utility: UtilityCss;
  /**
   * Optional grouping key for `mode: 'split'`. Rules with the same `bag`
   * end up in the same `<bag>.css` file. Ignored in merged mode.
   */
  bag?: string;
}

/** Output of `emitCss`. Discriminated by `kind`. */
export type EmittedCss = { kind: 'merged'; css: string } | { kind: 'split'; index: string; bags: Map<string, string> };

/**
 * Hoist configuration. When provided, every CSS custom property declaration
 * whose `(name, value)` is uniform across every rule that emits it is lifted
 * to a single rule on `rootSelector` and dropped from each individual rule.
 * Catches Tailwind's internal `--tw-*` resets (always-the-same-default) plus
 * any user-set tokens that happen to be uniform.
 *
 * Pass `false` to disable. If `hoist` is omitted, `emitCss` does **not**
 * hoist — callers opt in by configuration.
 */
export interface HoistOptions {
  /** Selector to attach hoisted declarations to (e.g. `.media-default-skin`). */
  rootSelector: string;
}

export interface EmitCssOptions {
  /** Compiled rules to emit. */
  rules: readonly CompiledRule[];
  /**
   * Layout mode:
   *   - `'merged'` (default): one CSS string with all rules.
   *   - `'split'`: one string per `bag` plus an `index` string with
   *     `@import` lines for each bag in stable order.
   */
  mode?: 'merged' | 'split';
  /**
   * Optional list of CSS files to prepend to the output (verbatim, after
   * `@import` resolution via Lightning CSS). In `'split'` mode they go into
   * `index` only, not duplicated across bags.
   */
  baseCss?: readonly string[];
  /**
   * Directory relative `baseCss` paths resolve against. Defaults to `cwd`.
   */
  configDir?: string;
  /**
   * Hoist uniform `--<custom-property>` declarations to a single root rule.
   * See `HoistOptions`. Pass `false` (or omit) to leave declarations on
   * each rule.
   */
  hoist?: false | HoistOptions;
  /**
   * Inline matching CSS custom properties into the values that reference
   * them, then drop the declarations themselves. Useful for stripping
   * Tailwind's internal `--tw-*` slots from the final output.
   *
   *   - `true` — inline `--tw-*` (regex `/^--tw-/`).
   *   - `RegExp` — inline any `--name` whose name (excluding the leading
   *     `--`) matches.
   *   - omitted — no inlining.
   *
   * Resolution is per-rule: the setter for a property must live in the
   * same merged rule (root or nested) as the reference for inlining to
   * apply. References to unset matching properties keep their `var()`
   * fallback if present, otherwise they're left alone.
   */
  inlineVars?: true | RegExp;
  /**
   * Resolve a referenced `@theme` variable (e.g. `--spacing`) to its value.
   * When set, `emitCss` emits a leading rule defining every theme variable the
   * output references but doesn't itself declare, so the CSS resolves without a
   * separate Tailwind theme/preflight on the page. Typically
   * `design.resolveThemeVar`. Returns `undefined` to leave a variable alone
   * (e.g. `@property`-registered `--tw-*` slots).
   */
  resolveThemeVar?: (name: string) => string | undefined;
  /**
   * Selector the emitted theme block attaches to. Defaults to `:root`. Pass a
   * skin selector (e.g. `[data-skin="default-video"]`) to scope the variables.
   */
  themeSelector?: string;
}

/**
 * Compose `CompiledRule[]` into final CSS. Rules sharing the same emit
 * context (same selector chain + at-rule wrappers) merge their declarations
 * into a single CSS rule. Selectors that produce identical declaration sets
 * collapse into a comma-separated selector list.
 *
 * `baseCss` files are read via `lightningcss.bundleAsync` so their `@import`
 * chains flatten before prepending — the consumer's `tailwind.css` (or
 * any other base file) lands at the top of the output as a single block.
 */
export async function emitCss(opts: EmitCssOptions): Promise<EmittedCss> {
  const mode = opts.mode ?? 'merged';
  const configDir = opts.configDir ?? process.cwd();

  const hoist = opts.hoist === false ? undefined : opts.hoist;
  const inlineVars = normalizeInlineMatcher(opts.inlineVars);

  if (mode === 'merged') {
    const base = await bundleBaseCss(opts.baseCss ?? [], configDir);
    const body = composeRules(opts.rules, hoist, inlineVars);
    const theme = buildThemeBlock(body, opts.resolveThemeVar, opts.themeSelector);
    return { kind: 'merged', css: joinSections(base, theme, body) };
  }

  // Split mode: group rules by `bag`.
  const byBag = new Map<string, CompiledRule[]>();
  for (const rule of opts.rules) {
    const bag = rule.bag ?? '';
    const arr = byBag.get(bag) ?? [];
    arr.push(rule);
    byBag.set(bag, arr);
  }

  const bags = new Map<string, string>();
  const importLines: string[] = [];
  // Sort bag names for deterministic output.
  const sortedBags = [...byBag.keys()].sort();
  for (const bagName of sortedBags) {
    const bagRules = byBag.get(bagName)!;
    bags.set(bagName, composeRules(bagRules, undefined, inlineVars));
    importLines.push(`@import "./${bagName || 'index'}.css";`);
  }

  const base = await bundleBaseCss(opts.baseCss ?? [], configDir);
  // Theme variables go in `index` (it loads first), resolved against every bag.
  const theme = buildThemeBlock([...bags.values()].join('\n'), opts.resolveThemeVar, opts.themeSelector);
  const index = joinSections(base, theme, importLines.join('\n'));
  return { kind: 'split', index, bags };
}

/**
 * Build a leading rule that defines every `@theme` variable the emitted CSS
 * references but doesn't itself declare. Resolves transitively (a theme value
 * may reference further variables). Returns `''` when there's nothing to emit
 * or no resolver was supplied.
 */
function buildThemeBlock(
  css: string,
  resolveThemeVar: ((name: string) => string | undefined) | undefined,
  themeSelector: string | undefined
): string {
  if (!resolveThemeVar) return '';

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

  const selector = themeSelector ?? ':root';
  const decls = [...resolved.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `${selector} {\n${decls}\n}`;
}

/** Collect `var(--name)` references in a CSS string. */
function collectReferencedVars(css: string): Set<string> {
  const out = new Set<string>();
  const re = /var\(\s*(--[A-Za-z0-9_-]+)/g;
  let m: RegExpExecArray | null = re.exec(css);
  while (m !== null) {
    out.add(m[1]!);
    m = re.exec(css);
  }
  return out;
}

/** Collect custom properties *declared* (`--name:`) in a CSS string. */
function collectDefinedVars(css: string): Set<string> {
  const out = new Set<string>();
  const re = /(?:^|[{;\s])(--[A-Za-z0-9_-]+)\s*:/g;
  let m: RegExpExecArray | null = re.exec(css);
  while (m !== null) {
    out.add(m[1]!);
    m = re.exec(css);
  }
  return out;
}

/** Internal: read each `baseCss` file via Lightning CSS, return concatenated string. */
async function bundleBaseCss(paths: readonly string[], configDir: string): Promise<string> {
  if (paths.length === 0) return '';
  const decoder = new TextDecoder();
  const out: string[] = [];
  for (const p of paths) {
    const filename = isAbsolute(p) ? p : resolve(configDir, p);
    const result = await bundleAsync({ filename });
    out.push(decoder.decode(result.code).trim());
  }
  return out.join('\n\n');
}

/** Joins non-empty sections with two newlines. */
function joinSections(...sections: string[]): string {
  return sections.filter((s) => s.length > 0).join('\n\n');
}

/* ─────────────────────────────────────────────────────────────────────────
 * Rule composition
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Per-rule emit unit: a (selector, at-rule path) tuple maps to one or more
 * declarations. We bucket by `(atRulePath, selector)` so multiple rules
 * landing on the same selector + same at-rule wrappers merge their
 * declarations, and selectors with identical declaration sets fold into a
 * comma-separated list.
 */
interface EmitUnit {
  /** Outer-to-inner at-rule wrappers (e.g. [`@media (hover: hover)`]). */
  atRulePath: readonly string[];
  /** Selector text for the rule (e.g. `.play-button:hover` or `.play-button`). */
  selector: string;
  /** Declarations to emit inside the rule. */
  declarations: readonly Declaration[];
}

function composeRules(
  rules: readonly CompiledRule[],
  hoist: HoistOptions | undefined,
  inlineVars: RegExp | undefined
): string {
  // Step 1: turn each CompiledRule into one EmitUnit.
  const units: EmitUnit[] = [];
  for (const rule of rules) {
    units.push(buildEmitUnit(rule));
  }

  // Step 2: merge units by (atRulePath, selector). Dedupe declarations by
  // `(property, value)` since multiple utilities (e.g. `flex` + `items-center`
  // both setting `align-items: center`) can produce identical declarations.
  const merged = new Map<string, EmitUnit & { declarations: Declaration[]; declSet: Set<string> }>();
  for (const u of units) {
    const key = `${u.atRulePath.join('||')}\n${u.selector}`;
    let entry = merged.get(key);
    if (!entry) {
      entry = {
        atRulePath: u.atRulePath,
        selector: u.selector,
        declarations: [],
        declSet: new Set(),
      };
      merged.set(key, entry);
    }
    for (const d of u.declarations) {
      const dk = `${d.property}:${d.value}`;
      if (entry.declSet.has(dk)) continue;
      entry.declSet.add(dk);
      entry.declarations.push(d);
    }
  }

  // Step 2.5 (optional): hoist uniform CSS variable declarations to a single
  // root rule. See `applyHoist` for the conformance rule.
  if (hoist) applyHoist(merged, hoist.rootSelector);

  // Step 2.6 (optional): inline matching CSS custom properties into their
  // consumers, then drop the matching declarations. Pulls setters from the
  // consumer's own rule plus the hoist root (when set) so consumers in
  // separate rules from the original setter still resolve.
  if (inlineVars) applyInline(merged, inlineVars, hoist?.rootSelector);

  // Step 3: collapse units that share the same (atRulePath, declarations) into
  // a comma-separated selector list. Sort the declaration set to make the
  // collapse key stable. Skip units whose declarations were entirely hoisted.
  const collapsed = new Map<
    string,
    { atRulePath: readonly string[]; selectors: string[]; declarations: readonly Declaration[] }
  >();
  for (const u of merged.values()) {
    if (u.declarations.length === 0) continue;
    const declKey = sortDeclarations(u.declarations)
      .map((d) => `${d.property}:${d.value}`)
      .join(';');
    const key = `${u.atRulePath.join('||')}\n${declKey}`;
    const existing = collapsed.get(key);
    if (existing) {
      if (!existing.selectors.includes(u.selector)) existing.selectors.push(u.selector);
    } else {
      collapsed.set(key, {
        atRulePath: u.atRulePath,
        selectors: [u.selector],
        declarations: sortDeclarations(u.declarations),
      });
    }
  }

  // Step 4: sort selectors within each entry, then sort entries by at-rule
  // path depth + selector for stable output. The hoist root (if any) sorts
  // first inside its at-rule depth so cascade-dependent vars declare before
  // consumers that read them.
  const rootSelector = hoist?.rootSelector;
  for (const entry of collapsed.values()) entry.selectors.sort();
  const entries = [...collapsed.values()].sort((a, b) => {
    const depthDelta = a.atRulePath.length - b.atRulePath.length;
    if (depthDelta !== 0) return depthDelta;
    const atDelta = a.atRulePath.join('||').localeCompare(b.atRulePath.join('||'));
    if (atDelta !== 0) return atDelta;
    if (rootSelector) {
      const aIsRoot = a.selectors.includes(rootSelector);
      const bIsRoot = b.selectors.includes(rootSelector);
      if (aIsRoot !== bIsRoot) return aIsRoot ? -1 : 1;
    }
    return a.selectors[0]!.localeCompare(b.selectors[0]!);
  });

  // Step 5: emit. At-rule wrappers nest from outer to inner; rule body lists
  // selectors comma-separated and declarations one per line.
  return entries.map(serializeEntry).join('\n\n');
}

/**
 * Walk every merged unit and hoist CSS custom property declarations whose
 * `(name, value)` is uniform across every root-depth occurrence (and matches
 * any nested-depth occurrence too). The hoisted declarations attach to a
 * synthetic / merged-into `rootSelector` unit at root depth.
 *
 * Conformance rules:
 *
 *   1. The property must appear at **root depth at least once** — purely
 *      contextual values (`@media` / pseudo-only) stay where they are.
 *   2. **Every** root-depth occurrence must agree on the same value.
 *   3. **Every** nested-depth occurrence must also agree on that same value
 *      — otherwise the nested override is meaningful and we'd mis-hoist it
 *      to root.
 *
 * Mutates `merged` in place.
 */
function applyHoist(
  merged: Map<string, EmitUnit & { declarations: Declaration[]; declSet: Set<string> }>,
  rootSelector: string
): void {
  // Collect (property, value) per depth bucket so we can apply the
  // root-vs-nested conformance rule.
  const rootValues = new Map<string, Set<string>>();
  const allValues = new Map<string, Set<string>>();
  for (const entry of merged.values()) {
    const isRoot = entry.atRulePath.length === 0;
    for (const d of entry.declarations) {
      if (!d.property.startsWith('--')) continue;
      const all = allValues.get(d.property) ?? new Set<string>();
      all.add(d.value);
      allValues.set(d.property, all);
      if (isRoot) {
        const at = rootValues.get(d.property) ?? new Set<string>();
        at.add(d.value);
        rootValues.set(d.property, at);
      }
    }
  }

  // Hoist candidates: (1) appears at root depth, (2) all root-depth
  // occurrences agree, (3) all occurrences (root + nested) agree.
  const hoisted = new Map<string, string>();
  for (const [name, atRoot] of rootValues.entries()) {
    if (atRoot.size !== 1) continue;
    const all = allValues.get(name)!;
    if (all.size !== 1) continue;
    hoisted.set(name, [...atRoot][0]!);
  }
  if (hoisted.size === 0) return;

  // Drop hoisted declarations from every existing unit. We only touch
  // matching `(property, value)` pairs so future divergence (where a
  // future nested occurrence sets a different value) wouldn't accidentally
  // get stripped here.
  for (const entry of merged.values()) {
    const next: Declaration[] = [];
    const nextSet = new Set<string>();
    for (const d of entry.declarations) {
      if (hoisted.get(d.property) === d.value) continue;
      next.push(d);
      nextSet.add(`${d.property}:${d.value}`);
    }
    entry.declarations = next;
    entry.declSet = nextSet;
  }

  // Merge hoisted declarations into / create the root unit at root depth.
  const rootKey = `\n${rootSelector}`;
  let rootEntry = merged.get(rootKey);
  if (!rootEntry) {
    rootEntry = {
      atRulePath: [],
      selector: rootSelector,
      declarations: [],
      declSet: new Set(),
    };
    merged.set(rootKey, rootEntry);
  }
  for (const [property, value] of hoisted.entries()) {
    const dk = `${property}:${value}`;
    if (rootEntry.declSet.has(dk)) continue;
    rootEntry.declSet.add(dk);
    rootEntry.declarations.push({ property, value });
  }
}

function normalizeInlineMatcher(opt: true | RegExp | undefined): RegExp | undefined {
  if (opt === undefined) return undefined;
  if (opt === true) return /^--tw-/;
  return opt;
}

/**
 * Inline matching CSS custom properties into the values that reference them,
 * then drop the matching declarations.
 *
 * Setter resolution order, narrowest first:
 *
 *   1. Setters declared in the same merged rule as the reference.
 *   2. Setters declared on the hoist root rule (`hoistRootSelector`), if any.
 *
 * This mirrors the natural cascade — local declarations win, and hoist-root
 * declarations act as the skin's defaults. Cycles break after a fixed-point
 * pass.
 *
 * Mutates `merged` in place.
 */
function applyInline(
  merged: Map<string, EmitUnit & { declarations: Declaration[]; declSet: Set<string> }>,
  match: RegExp,
  hoistRootSelector: string | undefined
): void {
  // Pull root-scope setters once. They serve as fallback when a consumer
  // rule doesn't declare the property locally.
  const rootSetters = new Map<string, string>();
  if (hoistRootSelector !== undefined) {
    const rootEntry = merged.get(`\n${hoistRootSelector}`);
    if (rootEntry) {
      for (const d of rootEntry.declarations) {
        if (d.property.startsWith('--') && match.test(d.property)) {
          rootSetters.set(d.property, d.value);
        }
      }
      // Resolve root setters internally so chains within the root collapse.
      resolveSettersInPlace(rootSetters, match);
    }
  }

  for (const entry of merged.values()) {
    const isRoot = hoistRootSelector !== undefined && entry.selector === hoistRootSelector;
    const localSetters = new Map<string, string>();
    for (const d of entry.declarations) {
      if (d.property.startsWith('--') && match.test(d.property)) {
        localSetters.set(d.property, d.value);
      }
    }

    // Effective setters: rule-local first, hoist root as fallback.
    const setters = new Map<string, string>(rootSetters);
    for (const [name, value] of localSetters) setters.set(name, value);
    resolveSettersInPlace(setters, match);

    const next: Declaration[] = [];
    const nextSet = new Set<string>();
    for (const d of entry.declarations) {
      if (d.property.startsWith('--') && match.test(d.property)) {
        // The hoist root is where matching setters live for the rest of the
        // file to inline — drop it from the root unit too, since by now
        // every consumer has substituted its value. This leaves the root
        // free of `--tw-*` declarations, matching the spike's wipe.
        if (isRoot) continue;
        // Non-root rules also drop matching setters: their value has been
        // baked into the consumers above.
        continue;
      }
      const inlined = inlineValue(d.value, setters, match);
      next.push({ property: d.property, value: inlined });
      nextSet.add(`${d.property}:${inlined}`);
    }
    entry.declarations = next;
    entry.declSet = nextSet;
  }
}

/**
 * Resolve a `setters` map to a fixed point so values that reference other
 * matching properties substitute recursively. Mutates the map in place.
 */
function resolveSettersInPlace(setters: Map<string, string>, match: RegExp): void {
  if (setters.size === 0) return;
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const [name, value] of setters.entries()) {
      const next = inlineValue(value, setters, match);
      if (next !== value) {
        setters.set(name, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
}

/**
 * Replace every `var(--name)` / `var(--name, fallback)` reference in `value`
 * where `--name` matches `match` AND has an entry in `setters`. References to
 * unset matching properties collapse to their `var()` fallback if present,
 * else stay as `var(...)` (the runtime CSS engine will resolve them — or
 * not — at use time).
 */
function inlineValue(value: string, setters: Map<string, string>, match: RegExp): string {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const start = value.indexOf('var(', i);
    if (start === -1) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, start);

    // Find the matching closing paren, accounting for nested `var()`.
    let depth = 1;
    let j = start + 4;
    while (j < value.length && depth > 0) {
      const c = value[j]!;
      if (c === '(') depth++;
      else if (c === ')') depth--;
      if (depth === 0) break;
      j++;
    }
    if (depth !== 0) {
      // Unclosed `var()` — bail and emit the remainder verbatim.
      out += value.slice(start);
      break;
    }
    const inner = value.slice(start + 4, j);
    const replacement = resolveVarRef(inner, setters, match);
    out += replacement;
    i = j + 1;
  }
  return out;
}

/**
 * Resolve a single `var()` argument list (the bit inside the parens). Returns
 * the substituted string. If the property doesn't match or isn't set, returns
 * the original `var(<inner>)` text.
 */
function resolveVarRef(inner: string, setters: Map<string, string>, match: RegExp): string {
  const commaIdx = findTopLevelComma(inner);
  const name = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
  const fallback = commaIdx === -1 ? undefined : inner.slice(commaIdx + 1).trim();

  if (!name.startsWith('--')) return `var(${inner})`;

  if (match.test(name)) {
    if (setters.has(name)) {
      // Recurse so a value containing further `var(...)` references resolves.
      return inlineValue(setters.get(name)!, setters, match);
    }
    if (fallback !== undefined) {
      // Inline the fallback (it may itself reference vars we should resolve).
      return inlineValue(fallback, setters, match);
    }
    // Unset, no fallback — leave the reference for the browser to try.
    return `var(${inner})`;
  }

  // Property doesn't match the inline filter. Still process the fallback so
  // nested `var(--tw-x, var(--tw-y))` references inline through.
  if (fallback === undefined) return `var(${inner})`;
  return `var(${name}, ${inlineValue(fallback, setters, match)})`;
}

function findTopLevelComma(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) return i;
  }
  return -1;
}

function buildEmitUnit(rule: CompiledRule): EmitUnit {
  const atRulePath: string[] = [];
  let selectorTail = '';

  for (const v of rule.utility.variants) {
    if (v.atRule) {
      atRulePath.push(`@${v.atRule.name} ${v.atRule.params}`.trim());
    } else if (v.selector) {
      selectorTail += v.selector;
    }
  }

  return {
    atRulePath,
    selector: `.${rule.className}${selectorTail}`,
    declarations: rule.utility.declarations,
  };
}

function sortDeclarations(decls: readonly Declaration[]): readonly Declaration[] {
  return [...decls].sort((a, b) => a.property.localeCompare(b.property));
}

function serializeEntry(entry: {
  atRulePath: readonly string[];
  selectors: string[];
  declarations: readonly Declaration[];
}): string {
  const indent = (n: number): string => '  '.repeat(n);
  const inner = serializeRule(entry.selectors, entry.declarations, entry.atRulePath.length);
  let out = inner;
  for (let i = entry.atRulePath.length - 1; i >= 0; i--) {
    const wrapper = entry.atRulePath[i]!;
    out = `${indent(i)}${wrapper} {\n${out}\n${indent(i)}}`;
  }
  return out;
}

function serializeRule(selectors: readonly string[], declarations: readonly Declaration[], depth: number): string {
  const indent = '  '.repeat(depth);
  const inner = '  '.repeat(depth + 1);
  const selectorList = selectors.join(`,\n${indent}`);
  const declLines = declarations.map((d) => `${inner}${d.property}: ${d.value};`).join('\n');
  return `${indent}${selectorList} {\n${declLines}\n${indent}}`;
}
