/**
 * Returns only the `<script>` and `<style>` elements from an HTML fragment, in document order.
 *
 * Astro renders every slot eagerly when it creates a component instance, before the component's own frontmatter runs,
 * and it deduplicates page-level assets at that moment: the `<astro-island>` definition and its `<style>`, `client:*`
 * directive scripts, and hoisted component `<script>` tags are each emitted into the first output that needs them and
 * never again. A component that then discards that slot output would discard the only copy, so callers use this to keep
 * those assets while dropping the markup around them.
 */
export function extractScriptsAndStyles(html: string): string {
  return html.match(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)?.join('') ?? '';
}
