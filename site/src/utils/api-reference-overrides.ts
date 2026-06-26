import { kebabCase } from 'es-toolkit/string';

/**
 * Components whose PascalCase name doesn't match a simple kebab-to-pascal
 * conversion. Keyed by kebab directory name (which is also the generated
 * reference file slug) → PascalCase component name.
 *
 * Consumed by the api-docs-builder for generation, and inverted below so
 * reference pages can resolve the file slug from the public component name.
 */
export const NAME_OVERRIDES: Record<string, string> = {
  'pip-button': 'PiPButton',
  'airplay-button': 'AirPlayButton',
};

/**
 * Media elements whose PascalCase name doesn't kebab-case to their element tag
 * name (media reference files are named by tag name). Keyed by component name →
 * tag-name slug.
 */
export const MEDIA_SLUG_OVERRIDES: Record<string, string> = {
  HlsJsVideo: 'hlsjs-video',
};

const COMPONENT_NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_OVERRIDES).map(([slug, name]) => [name, slug])
);

/** Resolve a component's generated-reference slug from its PascalCase name. */
export function resolveComponentSlug(name: string): string {
  return COMPONENT_NAME_TO_SLUG[name] ?? kebabCase(name);
}

/** Resolve a media element's generated-reference slug from its PascalCase name. */
export function resolveMediaSlug(name: string): string {
  return MEDIA_SLUG_OVERRIDES[name] ?? kebabCase(name);
}
