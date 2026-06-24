import type { MdastPluginInstance } from 'satteri';

/**
 * Sätteri doesn't export its visitor-context class, so derive it from a visitor
 * signature. Every visitor receives the same context object.
 */
export type MdastVisitorContext = Parameters<NonNullable<MdastPluginInstance['heading']>>[1];

/**
 * Shape of the document data bag `@astrojs/markdown-satteri` (and the MDX
 * integration's Sätteri path) seed before running plugins. Whatever a plugin
 * leaves on `astro.frontmatter` is surfaced to templates as
 * `render().remarkPluginFrontmatter`.
 */
interface AstroData {
  frontmatter: Record<string, unknown>;
  headings: Array<{ depth: number; slug: string; text: string }>;
}

/** Typed accessor for the Astro frontmatter bag a Sätteri plugin writes into. */
export function getAstroFrontmatter(ctx: MdastVisitorContext): Record<string, unknown> | undefined {
  const astro = (ctx.data as { astro?: AstroData }).astro;
  return astro?.frontmatter;
}
