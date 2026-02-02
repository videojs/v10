export const FRAMEWORK_STYLES = {
  react: ['css'],
  html: ['css'],
} as const;

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
}

export interface Section {
  sidebarLabel: string;
  frameworks?: SupportedFramework[];
  devOnly?: boolean; // only visible in development mode
  contents: Array<Guide | Section>;
}

export type Sidebar = Array<Guide | Section>;

/**
 * Type guard to check if an item is a Section (vs a Guide)
 */
export function isSection(item: Guide | Section): item is Section {
  return 'contents' in item;
}
