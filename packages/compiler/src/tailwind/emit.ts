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
   * Optional logical grouping key. `mode: 'split'` writes rules with the same
   * group to the same `<group>.css` file; merged mode preserves the metadata
   * but emits one stylesheet.
   */
  group?: string;
}

/** Output of `emitCss`. Discriminated by `kind`. */
export type EmittedCss =
  | { kind: 'merged'; css: string }
  | {
      kind: 'split';
      index: string;
      /** CSS chunks keyed by safe file stem, not raw group name. */
      groups: Map<string, string>;
    };

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
   *   - `'split'`: one string per group plus an `index` string with
   *     `@import` lines for each group in stable order.
   */
  mode?: 'merged' | 'split';
  /**
   * Optional list of CSS files to prepend to the output (verbatim, after
   * `@import` resolution via Lightning CSS). In `'split'` mode they go into
   * `index` only, not duplicated across groups.
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
   * Tailwind's internal `--tw-*` registered variables from the final output.
   *
   *   - `true` — inline `--tw-*` (regex `/^--tw-/`).
   *   - `RegExp` — inline any custom property whose full name matches.
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
   * (e.g. `@property`-registered `--tw-*` variables).
   */
  resolveThemeVar?: (name: string) => string | undefined;
  /**
   * Selector the emitted theme block attaches to. Defaults to `:root`. Pass a
   * skin selector (e.g. `[data-skin="default-video"]`) to scope the variables.
   */
  themeSelector?: string;
  /**
   * How to handle Tailwind's `@property`-registered variables (e.g. `--tw-content`,
   * `--tw-shadow`) that the compiled rules reference but never set locally.
   * Without this they resolve to nothing and break — e.g. `content:
   * var(--tw-content)` suppresses the `::after`/`::before` box.
   *
   * Omit to leave them alone (current behavior). See `RegisteredPropertiesOptions`.
   */
  properties?: RegisteredPropertiesOptions;
}

/** A `@property` definition (sans name), as captured or overridden. */
export interface PropertyDef {
  /** `@property` syntax descriptor, e.g. `"*"`. Defaults to `"*"` when emitted. */
  syntax?: string;
  /** Whether the property inherits. Defaults to `false` when emitted. */
  inherits?: boolean;
  /** The registered default, e.g. `""` for `--tw-content`. */
  initialValue?: string;
}

export interface RegisteredPropertiesOptions {
  /**
   * - `'emit'`   — emit `@property` rules for referenced variables, preserving
   *   Tailwind's typed defaults (relies on browser `@property` support).
   * - `'inline'` — substitute each variable's `initial-value` into the values that
   *   reference it (and drop any `--tw-*` setter declarations), so the output
   *   is fully self-contained. This is a superset of `inlineVars` for the
   *   matched variables.
   */
  mode: 'emit' | 'inline';
  /** Variable matchers and optional definition resolvers. Defaults to `inlineVars`, else `/^--tw-/`. */
  variables?: readonly RegisteredPropertyVariableOptions[] | undefined;
}

export interface RegisteredPropertyVariableOptions {
  /** Which registered property names this rule handles. */
  match: RegExp;
  /**
   * Override or supply a property's definition. Receives the name and the
   * definition captured from Tailwind's output (if any); return a new
   * definition (merged in), or `undefined` to keep the captured one. Lets you
   * fix an initial-value or register a variable Tailwind didn't.
   */
  resolve?: (name: string, captured: PropertyDef | undefined) => PropertyDef | undefined;
}

type VariableMatcher = (name: string) => boolean;

interface RegisteredPropertyVariable {
  match: VariableMatcher;
  resolve?: ((name: string, captured: PropertyDef | undefined) => PropertyDef | undefined) | undefined;
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

  // Registered `@property` (--tw-*) handling. In 'inline' mode the variables'
  // initial-values seed the inline pass as fallbacks (and the matcher widens to
  // cover them, even when `inlineVars` was off). In 'emit' mode they're left in
  // place to be emitted as `@property` rules.
  const propMode = opts.properties?.mode;
  const captured = collectPropertyDefs(opts.rules);
  const referenced = collectReferencedVarsFromRules(opts.rules);
  const propertyVariables = opts.properties ? normalizePropertyVariables(opts.properties.variables, inlineVars) : [];
  const propertyMatch = propertyVariables.length > 0 ? matchAny(propertyVariables) : undefined;
  const resolveDef = (name: string): PropertyDef | undefined => {
    const cap = captured.get(name);
    const variable = propertyVariables.find((v) => v.match(name));
    return variable?.resolve?.(name, cap) ?? cap;
  };
  const inlineMatch = propMode === 'inline' ? combineMatchers(inlineVars, propertyMatch) : inlineVars;
  const fallbacks =
    propMode === 'inline' && propertyMatch
      ? buildFallbackSetters(captured, referenced, propertyMatch, resolveDef)
      : undefined;
  const emitProperties = (css: string): string =>
    propMode === 'emit' && propertyMatch ? buildPropertyBlocks(css, propertyMatch, resolveDef) : '';

  if (mode === 'merged') {
    const base = await bundleBaseCss(opts.baseCss ?? [], configDir);
    const body = composeRules(opts.rules, hoist, inlineMatch, fallbacks);
    const theme = buildThemeBlock(body, opts.resolveThemeVar, opts.themeSelector);
    const properties = emitProperties(body);
    return { kind: 'merged', css: joinSections(base, properties, theme, body) };
  }

  // Split mode: group rules by resolved group.
  const byGroup = new Map<string, CompiledRule[]>();
  for (const rule of opts.rules) {
    const group = rule.group ?? '';
    const arr = byGroup.get(group) ?? [];
    arr.push(rule);
    byGroup.set(group, arr);
  }

  const groups = new Map<string, string>();
  const importLines: string[] = [];
  const groupFileNames = new Set<string>();
  // Sort group names for deterministic output.
  const sortedGroups = [...byGroup.keys()].sort();
  for (const groupName of sortedGroups) {
    const groupRules = byGroup.get(groupName)!;
    const fileName = groupCssFileName(groupName, groupFileNames);
    groups.set(fileName, composeRules(groupRules, undefined, inlineMatch, fallbacks));
    importLines.push(`@import "./${fileName}.css";`);
  }

  const base = await bundleBaseCss(opts.baseCss ?? [], configDir);
  // Theme variables and @property rules go in `index` (it loads first),
  // resolved against every group.
  const allGroupsCss = [...groups.values()].join('\n');
  const theme = buildThemeBlock(allGroupsCss, opts.resolveThemeVar, opts.themeSelector);
  const properties = emitProperties(allGroupsCss);
  const index = joinSections(base, properties, theme, importLines.join('\n'));
  return { kind: 'split', index, groups };
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

function collectReferencedVarsFromRules(rules: readonly CompiledRule[]): Set<string> {
  const out = new Set<string>();
  for (const rule of rules) {
    for (const declaration of rule.utility.declarations) {
      for (const name of collectReferencedVars(declaration.value)) out.add(name);
    }
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

/* ─────────────────────────────────────────────────────────────────────────
 * Registered `@property` variables
 * ───────────────────────────────────────────────────────────────────────── */

/** Aggregate the `@property` defs captured across every rule (first wins). */
function collectPropertyDefs(rules: readonly CompiledRule[]): Map<string, PropertyDef> {
  const out = new Map<string, PropertyDef>();
  for (const rule of rules) {
    for (const p of rule.utility.properties ?? []) {
      if (out.has(p.name)) continue;
      const { name, ...def } = p;
      out.set(name, def);
    }
  }
  return out;
}

/** Build the `name → initial-value` fallback map for `mode: 'inline'`. */
function buildFallbackSetters(
  captured: Map<string, PropertyDef>,
  referenced: Set<string>,
  match: VariableMatcher,
  resolveDef: (name: string) => PropertyDef | undefined
): Map<string, string> {
  const out = new Map<string, string>();
  const names = new Set([...captured.keys(), ...referenced]);
  for (const name of names) {
    if (!match(name)) continue;
    const def = resolveDef(name);
    if (def?.initialValue !== undefined) out.set(name, def.initialValue);
  }
  return out;
}

/**
 * Build `@property` rules for every matching variable the CSS references but
 * doesn't itself declare. Descriptors default to `syntax: "*"` / `inherits:
 * false` when a resolved def omits them.
 */
function buildPropertyBlocks(
  css: string,
  match: VariableMatcher,
  resolveDef: (name: string) => PropertyDef | undefined
): string {
  const referenced = [...collectReferencedVars(css)].filter(match).sort();
  const blocks: string[] = [];
  for (const name of referenced) {
    const def = resolveDef(name);
    if (!def) continue;
    const lines = [`  syntax: ${def.syntax ?? '"*"'};`, `  inherits: ${def.inherits ?? false};`];
    if (def.initialValue !== undefined) lines.push(`  initial-value: ${def.initialValue};`);
    blocks.push(`@property ${name} {\n${lines.join('\n')}\n}`);
  }
  return blocks.join('\n\n');
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

function groupCssFileName(groupName: string, used: Set<string>): string {
  const base = sanitizeGroupName(groupName);
  let fileName = base;
  let suffix = 2;
  while (used.has(fileName)) {
    fileName = `${base}-${suffix}`;
    suffix++;
  }
  used.add(fileName);
  return fileName;
}

function sanitizeGroupName(groupName: string): string {
  const trimmed = groupName.trim();
  if (!trimmed) return '_default';

  const safe = trimmed.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const fileName = safe || '_group';
  return fileName === 'index' ? '_index' : fileName;
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
  inlineVars: VariableMatcher | undefined,
  fallbackSetters?: Map<string, string>
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
  if (inlineVars) applyInline(merged, inlineVars, hoist?.rootSelector, fallbackSetters);

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

function normalizeInlineMatcher(opt: true | RegExp | undefined): VariableMatcher | undefined {
  if (opt === undefined) return undefined;
  if (opt === true) return regexMatcher(/^--tw-/);
  return regexMatcher(opt);
}

function normalizePropertyVariables(
  variables: readonly RegisteredPropertyVariableOptions[] | undefined,
  inlineVars: VariableMatcher | undefined
): RegisteredPropertyVariable[] {
  if (variables && variables.length > 0) {
    return variables.map((variable) => ({
      match: regexMatcher(variable.match),
      ...(variable.resolve ? { resolve: variable.resolve } : {}),
    }));
  }

  return [{ match: inlineVars ?? regexMatcher(/^--tw-/) }];
}

function regexMatcher(regex: RegExp): VariableMatcher {
  return (name) => {
    regex.lastIndex = 0;
    return regex.test(name);
  };
}

function matchAny(variables: readonly RegisteredPropertyVariable[]): VariableMatcher {
  return (name) => variables.some((variable) => variable.match(name));
}

function combineMatchers(
  first: VariableMatcher | undefined,
  second: VariableMatcher | undefined
): VariableMatcher | undefined {
  if (!first) return second;
  if (!second) return first;
  return (name) => first(name) || second(name);
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
  match: VariableMatcher,
  hoistRootSelector: string | undefined,
  fallbackSetters?: Map<string, string>
): void {
  // Pull root-scope setters once. They serve as fallback when a consumer
  // rule doesn't declare the property locally.
  const rootSetters = new Map<string, string>();
  if (hoistRootSelector !== undefined) {
    const rootEntry = merged.get(`\n${hoistRootSelector}`);
    if (rootEntry) {
      for (const d of rootEntry.declarations) {
        if (d.property.startsWith('--') && match(d.property)) {
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
      if (d.property.startsWith('--') && match(d.property)) {
        localSetters.set(d.property, d.value);
      }
    }

    // Effective setters, narrowest last: registered `@property` initial-values
    // (lowest), then hoist root, then rule-local. Initial-values resolve
    // references to variables no rule ever sets (e.g. `content: var(--tw-content)`).
    const setters = new Map<string, string>(fallbackSetters);
    for (const [name, value] of rootSetters) setters.set(name, value);
    for (const [name, value] of localSetters) setters.set(name, value);
    resolveSettersInPlace(setters, match);

    const next: Declaration[] = [];
    const nextSet = new Set<string>();
    for (const d of entry.declarations) {
      if (d.property.startsWith('--') && match(d.property)) {
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
function resolveSettersInPlace(setters: Map<string, string>, match: VariableMatcher): void {
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
function inlineValue(value: string, setters: Map<string, string>, match: VariableMatcher): string {
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
function resolveVarRef(inner: string, setters: Map<string, string>, match: VariableMatcher): string {
  const commaIdx = findTopLevelComma(inner);
  const name = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
  const fallback = commaIdx === -1 ? undefined : inner.slice(commaIdx + 1).trim();

  if (!name.startsWith('--')) return `var(${inner})`;

  if (match(name)) {
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
