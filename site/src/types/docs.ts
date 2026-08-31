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
 * The frameworks whose readers use the `@videojs/html` custom-element API. Vue and Svelte have no adapter package of
 * their own: those readers install `@videojs/html` and write custom elements, so they read the same API content HTML
 * readers do.
 *
 * List this on content that documents that API — `frameworks={["html", "vue", "svelte"]}` in MDX, or this constant in
 * TypeScript. Gating is an exact match, so html-API content that omits Vue and Svelte is invisible to them.
 *
 * When a framework gains an adapter of its own, drop it from this list and give its content its own entries.
 */
export const HTML_API_FRAMEWORKS: SupportedFramework[] = ['html', 'vue', 'svelte'];

/**
 * The frameworks that read a given API platform's generated reference content. Reference data is authored per platform
 * (`html` or `react`), while gating compares against the reader's own framework, so the `html` platform expands to
 * every framework that consumes the `@videojs/html` API.
 */
export function apiPlatformFrameworks(platform: SupportedFramework): SupportedFramework[] {
  return platform === 'html' ? [...HTML_API_FRAMEWORKS] : [platform];
}

/**
 * Frameworks without a first-class adapter package borrow another framework's API surface for _display defaults_ —
 * which import statement to print, whether to show attribute names beside prop names, which package to name.
 *
 * Never use this for content gating. Visibility is an exact match against an explicitly authored framework list; see
 * `HTML_API_FRAMEWORKS` and `frameworkMatches`.
 */
export const CONTENT_FRAMEWORK_FALLBACK: Partial<Record<SupportedFramework, SupportedFramework>> = {
  vue: 'html',
  svelte: 'html',
};

/**
 * Resolve which framework's API surface a picker selection displays. Vue and Svelte resolve to `html`; every other
 * framework resolves to itself.
 *
 * Use this wherever a comparison decides which API variant to render (import statements, attribute vs. prop naming,
 * package names). Keep the raw framework wherever the value is the user's own framework identity — the picker value, a
 * URL segment, a label naming the framework, or any content-visibility decision.
 */
export function resolveContentFramework(framework: SupportedFramework): SupportedFramework {
  return CONTENT_FRAMEWORK_FALLBACK[framework] ?? framework;
}

/**
 * Decide whether content tagged for a set of frameworks is visible to the current framework. Content with no
 * `frameworks` restriction is visible everywhere; otherwise the current framework must be listed.
 *
 * Matching is exact. Content documenting the `@videojs/html` API has to list Vue and Svelte alongside `html` —
 * `HTML_API_FRAMEWORKS` is that list — or those readers never see it.
 *
 * @param current - The framework currently selected in the docs picker
 * @param frameworks - Frameworks the content is authored for; omit for "all frameworks"
 */
export function frameworkMatches(current: SupportedFramework, frameworks?: SupportedFramework[]): boolean {
  if (!frameworks) return true;

  return frameworks.includes(current);
}

export interface Guide {
  slug: string;
  sidebarLabel?: string; // defaults to guide title
  frameworks?: SupportedFramework[];
  devOnly?: boolean; // only visible in development mode
}

// Plain link to a page outside the docs (e.g. /changelog) — rendered with an
// outbound arrow, excluded from guide navigation (prev/next, slugs, llms index)
export interface SidebarLink {
  href: string;
  sidebarLabel: string;
  frameworks?: SupportedFramework[];
  devOnly?: boolean; // only visible in development mode
}

export interface Section {
  sidebarLabel: string;
  llmsDescription?: string;
  frameworks?: SupportedFramework[];
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
