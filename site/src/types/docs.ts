export const FRAMEWORK_STYLES = {
  react: ['css'],
  html: ['css'],
  vue: ['css'],
  svelte: ['css'],
} as const;

export type SupportedFramework = keyof typeof FRAMEWORK_STYLES;
export type SupportedStyle<F extends SupportedFramework> = (typeof FRAMEWORK_STYLES)[F][number];
export type AnySupportedStyle = SupportedStyle<SupportedFramework>;

export const FRAMEWORK_LABELS: Record<SupportedFramework, string> = {
  react: 'React',
  html: 'HTML',
  vue: 'Vue',
  svelte: 'Svelte',
};

export const STYLE_LABELS: Record<AnySupportedStyle, string> = {
  css: 'CSS',
};

export const SUPPORTED_FRAMEWORKS = Object.keys(FRAMEWORK_STYLES) as (keyof typeof FRAMEWORK_STYLES)[];
export const DEFAULT_FRAMEWORK = Object.keys(FRAMEWORK_STYLES)[0] as SupportedFramework;

export const ALL_FRAMEWORK_STYLE_COMBINATIONS = SUPPORTED_FRAMEWORKS.flatMap((framework) => {
  const availableStyles = FRAMEWORK_STYLES[framework];

  return availableStyles.map((style) => ({
    framework,
    style,
    key: `${framework}-${style}`,
  }));
});

export function getDefaultStyle<F extends SupportedFramework>(framework: F): SupportedStyle<F> {
  return FRAMEWORK_STYLES[framework][0];
}

export function isValidFramework(value: string | undefined | null): value is SupportedFramework {
  if (!value) return false;

  return SUPPORTED_FRAMEWORKS.includes(value as SupportedFramework);
}

export function isValidStyleForFramework(
  framework: SupportedFramework,
  style: string | undefined | null
): style is AnySupportedStyle {
  if (!style) return false;

  return FRAMEWORK_STYLES[framework].includes(style as any);
}

/**
 * Frameworks without a first-class adapter package consume another framework's content. Vue and Svelte users install
 * `@videojs/html` and write custom elements, so their picker selections resolve to the HTML API content.
 *
 * A framework only appears here while it has no adapter of its own. Give it one, drop its entry, and every fallback
 * below turns back into an exact match with no other change.
 */
export const CONTENT_FRAMEWORK_FALLBACK: Partial<Record<SupportedFramework, SupportedFramework>> = {
  vue: 'html',
  svelte: 'html',
};

/**
 * Resolve which framework's authored content a picker selection reads. Vue and Svelte resolve to `html`; every other
 * framework resolves to itself.
 *
 * Use this wherever a comparison decides which API variant to render (import statements, attribute vs. prop naming,
 * package names). Keep the raw framework wherever the value is the user's own framework identity — the picker value, a
 * URL segment, or a label naming the framework.
 */
export function resolveContentFramework(framework: SupportedFramework): SupportedFramework {
  return CONTENT_FRAMEWORK_FALLBACK[framework] ?? framework;
}

/**
 * Decide whether content tagged for a set of frameworks is visible to the current framework.
 *
 * Rules, in order:
 *
 * - No `frameworks` restriction: visible to every framework that is not excluded.
 * - Listed in `exclude`: hidden, even when `frameworks` matches. This is the escape hatch for content that a fallback
 *   framework should not inherit, for example HTML content sitting next to a Vue-specific variant.
 * - Listed in `frameworks`: visible (exact match).
 * - The framework's content framework is listed in `frameworks`: visible (fallback match, so `['html']` content reaches
 *   Vue and Svelte).
 * - Otherwise hidden.
 *
 * @param current - The framework currently selected in the docs picker
 * @param frameworks - Frameworks the content is authored for; omit for "all frameworks"
 * @param exclude - Frameworks that must not see this content, overriding both match kinds
 */
export function frameworkMatches(
  current: SupportedFramework,
  frameworks?: SupportedFramework[],
  exclude?: SupportedFramework[]
): boolean {
  if (exclude?.includes(current)) return false;

  if (!frameworks) return true;

  if (frameworks.includes(current)) return true;

  return frameworks.includes(resolveContentFramework(current));
}

export interface Guide {
  slug: string;
  sidebarLabel?: string; // defaults to guide title
  frameworks?: SupportedFramework[];
  /** Frameworks hidden from this guide even when `frameworks` matches them through a content-framework fallback. */
  excludeFrameworks?: SupportedFramework[];
  devOnly?: boolean; // only visible in development mode
}

// Plain link to a page outside the docs (e.g. /changelog) — rendered with an
// outbound arrow, excluded from guide navigation (prev/next, slugs, llms index)
export interface SidebarLink {
  href: string;
  sidebarLabel: string;
  frameworks?: SupportedFramework[];
  /** Frameworks hidden from this link even when `frameworks` matches them through a content-framework fallback. */
  excludeFrameworks?: SupportedFramework[];
  devOnly?: boolean; // only visible in development mode
}

export interface Section {
  sidebarLabel: string;
  llmsDescription?: string;
  frameworks?: SupportedFramework[];
  /** Frameworks hidden from this section even when `frameworks` matches them through a content-framework fallback. */
  excludeFrameworks?: SupportedFramework[];
  devOnly?: boolean; // only visible in development mode
  defaultOpen?: boolean;
  contents: Array<Guide | Section | SidebarLink>;
}

export type SidebarItem = Guide | Section | SidebarLink;

export type Sidebar = Array<SidebarItem>;

/** Type guard to check if an item is a Section (vs a Guide or SidebarLink) */
export function isSection(item: SidebarItem): item is Section {
  return 'contents' in item;
}

export function isLink(item: SidebarItem): item is SidebarLink {
  return 'href' in item;
}
