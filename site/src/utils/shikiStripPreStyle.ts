import type { ShikiTransformer } from 'shiki';

/**
 * Strip the inline `style` Astro's Shiki highlighter writes onto the `<pre>`
 * (the theme `background-color`/`color` and a trailing `overflow-x: auto`).
 *
 * Shiki should highlight the *text*; the code container is ours to style
 * (`CodeFrame` + the `.astro-code` rules). This restores the pre-Sätteri
 * behaviour, where `Pre.astro` deliberately discarded the pre's inline style so
 * the surrounding frame owned the background and scrolling. Token colors live
 * on the inner spans, so they are unaffected.
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
