export const FRAMEWORK_STYLES = {
  react: ['css'],
  html: ['css'],
} as const;

export const DOC_STABILITIES = ['experimental'] as const;

export type DocStability = (typeof DOC_STABILITIES)[number];

/** The Diátaxis mode a docs page is written in. Derived from its content folder, never declared by hand. */
export const DOC_TYPES = ['concept', 'guide', 'reference'] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS = {
  concept: 'Concept',
  guide: 'Guide',
  reference: 'Reference',
} satisfies Record<DocType, string>;

// The authoring guides under writing-style are dev-only how-tos for contributors.
const DOC_TYPE_FOLDERS: Record<string, DocType> = {
  concepts: 'concept',
  guides: 'guide',
  reference: 'reference',
  'writing-style': 'guide',
};

/**
 * Resolve the document type from a docs collection id such as `guides/autoplay`. The folder is the single source of
 * truth for the type, so a page filed in the wrong folder is the wrong type; there is no frontmatter override.
 */
export function getDocTypeFromId(id: string): DocType {
  const folder = id.split('/')[0] ?? '';
  const type = DOC_TYPE_FOLDERS[folder];

  if (!type) {
    throw new Error(
      `Docs entry "${id}" is not inside a typed folder. Place it under one of: ${Object.keys(DOC_TYPE_FOLDERS).join(', ')}.`
    );
  }

  return type;
}

export type SupportedFramework = keyof typeof FRAMEWORK_STYLES;
export type SupportedStyle<F extends SupportedFramework> = (typeof FRAMEWORK_STYLES)[F][number];
export type AnySupportedStyle = SupportedStyle<SupportedFramework>;

export const FRAMEWORK_LABELS: Record<SupportedFramework, string> = {
  react: 'React',
  html: 'HTML',
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

export interface Guide {
  slug: string;
  sidebarLabel?: string; // defaults to guide title
  frameworks?: SupportedFramework[];
  devOnly?: boolean; // only visible in development mode
  /** Build the page and keep it in breadcrumbs and llms.txt, but leave it out of the sidebar list and prev/next. */
  hidden?: boolean;
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
