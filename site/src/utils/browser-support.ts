import browserslist from 'browserslist';
import * as caniuse from 'caniuse-lite';
import caniusePackage from 'caniuse-lite/package.json' with { type: 'json' };

import rootPackage from '../../../package.json' with { type: 'json' };

/** The browsers the support policy names, in the order the docs list them. */
export const SUPPORT_BROWSERS = [
  { id: 'chrome', name: 'Chrome' },
  { id: 'edge', name: 'Edge' },
  { id: 'firefox', name: 'Firefox' },
  { id: 'safari', name: 'Safari' },
  { id: 'ios_saf', name: 'Safari on iOS' },
] as const;

export type SupportBrowserId = (typeof SUPPORT_BROWSERS)[number]['id'];

/**
 * Browsers that ship CSS features together share one docs column: Chrome with Edge, and Safari with Safari on iOS. Text
 * names both only when their versions differ.
 */
export const SUPPORT_GROUPS = [
  { label: 'Chrome and Edge', ids: ['chrome', 'edge'] },
  { label: 'Firefox', ids: ['firefox'] },
  { label: 'Safari and iOS', ids: ['safari', 'ios_saf'] },
] as const satisfies readonly { label: string; ids: readonly SupportBrowserId[] }[];

/**
 * First supporting versions from MDN browser-compat-data for features caniuse does not track. caniuse has no entry for
 * these color functions (`css-lch-lab` covers `lab()` and `lch()` only) or for the Popover API.
 */
const MDN_FEATURES = new Map<string, { url: string; versions: Record<SupportBrowserId, string> }>([
  [
    'color-mix',
    {
      url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix',
      versions: { chrome: '111', edge: '111', firefox: '113', safari: '16.2', ios_saf: '16.2' },
    },
  ],
  [
    'oklch',
    {
      url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch',
      versions: { chrome: '111', edge: '111', firefox: '113', safari: '15.4', ios_saf: '15.4' },
    },
  ],
  [
    'light-dark',
    {
      url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark',
      versions: { chrome: '123', edge: '123', firefox: '120', safari: '17.5', ios_saf: '17.5' },
    },
  ],
  [
    'contrast-color',
    {
      url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/contrast-color',
      versions: { chrome: '147', edge: '147', firefox: '146', safari: '26', ios_saf: '26' },
    },
  ],
  [
    'popover',
    {
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Popover_API',
      versions: { chrome: '114', edge: '114', firefox: '125', safari: '17', ios_saf: '17' },
    },
  ],
]);

/** A CSS feature the skins need, keyed by its caniuse feature id or an `MDN_FEATURES` key. */
export interface CssRequirement {
  id: string;
  label: string;
  /** Whether the label is CSS syntax, such as `@layer`, rather than a feature name. */
  code: boolean;
  /** What a reader sees in a browser without the feature. */
  effect: string;
}

/**
 * Features in the generated skin stylesheets that have no fallback, so every supported browser must have them. The
 * guide describes features with a fallback and reads their versions through `missingVersions()`.
 */
export const CSS_REQUIREMENTS: readonly CssRequirement[] = [
  { id: 'css-cascade-layers', label: '@layer', code: true, effect: 'No component styling' },
  { id: 'css-container-queries', label: '@container', code: true, effect: 'Controls do not adapt to player width' },
  {
    id: 'css-media-range-syntax',
    label: 'Media query range syntax',
    code: false,
    effect: 'Large-screen sizing is lost',
  },
  { id: 'css-has', label: ':has()', code: true, effect: 'Menu and slider focus states are lost' },
  { id: 'color-mix', label: 'color-mix()', code: true, effect: 'Skin colors are lost' },
  { id: 'oklch', label: 'oklch()', code: true, effect: 'Skin colors are lost' },
];

export interface ResolvedBrowser {
  id: SupportBrowserId;
  name: string;
  /** Resolved versions, oldest first. */
  versions: string[];
  /** Human range such as `150–151` or a single version. */
  range: string;
  /** The oldest resolved version for display, such as `16.4`, or `null` when the query names none. */
  minimum: string | null;
}

/** The browserslist query the repository builds against, from the root `package.json`. */
export const BROWSERSLIST_QUERY: readonly string[] = rootPackage.browserslist;

/** Numeric sort key for caniuse version strings such as `17.4`, `150`, or `15.0-15.1`. */
export function versionNumber(version: string): number {
  return Number.parseFloat(version.split('-')[0] ?? version);
}

/** Show the first version of a caniuse range without a trailing `.0`, so Safari 16.0 and iOS 16.0 both read "16". */
function displayVersion(version: string): string {
  return (version.split('-')[0] ?? version).replace(/\.0$/, '');
}

/** Resolve the browserslist query into one row per policy browser. */
export function resolveSupportedBrowsers(query: readonly string[] = BROWSERSLIST_QUERY): ResolvedBrowser[] {
  const resolved = browserslist([...query]);

  return SUPPORT_BROWSERS.map(({ id, name }) => {
    const versions = resolved
      .filter((entry) => entry.startsWith(`${id} `))
      .map((entry) => entry.slice(id.length + 1))
      .sort((a, b) => versionNumber(a) - versionNumber(b));
    const first = versions[0];
    const last = versions[versions.length - 1];
    const range = !first
      ? '—'
      : first === last
        ? displayVersion(first)
        : `${displayVersion(first)}–${displayVersion(last)}`;

    return { id, name, versions, range, minimum: first ? displayVersion(first) : null };
  });
}

/** Share of global web usage on the browsers the query resolves to, as a percentage. */
export function supportedCoverage(query: readonly string[] = BROWSERSLIST_QUERY): number {
  return browserslist.coverage(browserslist([...query]));
}

export interface FeatureSupport {
  requirement: CssRequirement;
  /** First fully supporting version per policy browser, or `null` when the browser has no full support. */
  firstVersion: Record<SupportBrowserId, string | null>;
  /** The feature's caniuse.com page, or its MDN page when caniuse does not track it. */
  url: string;
}

function isFullSupport(stat: string | undefined): boolean {
  return stat !== undefined && /^y/.test(stat);
}

function featureData(id: string) {
  const packed = caniuse.features[id];
  if (!packed) throw new Error(`Unknown caniuse feature: ${id}`);

  return caniuse.feature(packed);
}

/** First fully supporting version of a feature per policy browser, or `null` when a browser has none. */
export function featureFirstVersions(id: string): Record<SupportBrowserId, string | null> {
  const mdn = MDN_FEATURES.get(id);
  if (mdn) return mdn.versions;

  const data = featureData(id);

  // SAFETY: the entries are built from SUPPORT_BROWSERS, so every SupportBrowserId key is present exactly once.
  return Object.fromEntries(
    SUPPORT_BROWSERS.map(({ id: browser }) => {
      const stats = data.stats[browser] ?? {};
      const versions = caniuse.agents[browser]?.versions.filter((version): version is string => version !== null) ?? [];
      const first = versions.find((version) => isFullSupport(stats[version]));

      return [browser, first ? displayVersion(first) : null];
    })
  ) as Record<SupportBrowserId, string | null>;
}

/** The support data page for a feature id. */
export function featureUrl(id: string): string {
  return MDN_FEATURES.get(id)?.url ?? `https://caniuse.com/${id}`;
}

/** Read first-supporting versions for one requirement. */
export function featureSupport(requirement: CssRequirement): FeatureSupport {
  return { requirement, firstVersion: featureFirstVersions(requirement.id), url: featureUrl(requirement.id) };
}

/** Support data for every requirement, in table order. */
export function cssRequirementSupport(requirements: readonly CssRequirement[] = CSS_REQUIREMENTS): FeatureSupport[] {
  return requirements.map(featureSupport);
}

function browserName(id: SupportBrowserId): string {
  return SUPPORT_BROWSERS.find((browser) => browser.id === id)?.name ?? id;
}

/** Phrase one value per group, naming each browser separately only when a group's browsers disagree. */
function joinGroups(
  valueOf: (id: SupportBrowserId) => string | null,
  phrase: (name: string, value: string) => string
): string | null {
  const phrases = SUPPORT_GROUPS.flatMap(({ label, ids }) => {
    const values = ids.map(valueOf);
    if (new Set(values).size === 1) return values[0] ? [phrase(label, values[0])] : [];

    return ids.flatMap((id, index) => (values[index] ? [phrase(browserName(id), values[index])] : []));
  });

  return phrases.length > 0 ? phrases.join(', ') : null;
}

/** First fully supporting version of a feature, such as `Chrome and Edge 118, Firefox 146, Safari and iOS 17.4`. */
export function firstVersions(id: string): string {
  const versions = featureFirstVersions(id);
  const text = joinGroups(
    (browser) => versions[browser] ?? 'none',
    (name, version) => (version === 'none' ? `no ${name} version` : `${name} ${version}`)
  );

  return text ?? '';
}

/**
 * Supported browser versions that lack a feature, such as `Chrome and Edge before 131, Safari and iOS before 18`, or
 * `null` when every supported version has it.
 */
export function missingVersions(
  id: string,
  browsers: readonly ResolvedBrowser[] = resolveSupportedBrowsers()
): string | null {
  const versions = featureFirstVersions(id);
  const missing = new Map(
    browsers.map(({ id: browser, minimum }) => {
      const first = versions[browser];

      if (!minimum) return [browser, null];

      if (!first) return [browser, 'all'];

      return [browser, versionNumber(first) > versionNumber(minimum) ? first : null];
    })
  );

  return joinGroups(
    (browser) => missing.get(browser) ?? null,
    (name, first) => (first === 'all' ? `all ${name} versions` : `${name} before ${first}`)
  );
}

/** The `caniuse-lite` data version the numbers come from. */
export function caniuseVersion(): string {
  return caniusePackage.version;
}
