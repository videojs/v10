import type { ShikiTransformer } from 'shiki';

/**
 * Strip the inline `style` Astro's Shiki highlighter writes onto the `<pre>`
 * (the theme `background-color`/`color` and a trailing `overflow-x: auto`).
 *
 * Shiki should only highlight the text; the code container's background and
 * scrolling are owned by `CodeFrame` and the `.astro-code` rules. Token colors
 * live on the inner spans, while `.astro-code` supplies the plaintext color.
 *
 * Astro adds its built-in `pre` transformer before user transformers, so this
 * one runs last and sees the fully-assembled style to remove.
 */
export const shikiStripPreStyle: ShikiTransformer = {
  name: 'strip-pre-inline-style',
  pre(node) {
    delete node.properties.style;
  },
};
