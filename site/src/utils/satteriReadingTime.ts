import getReadingTime from 'reading-time';
import type { MdastPluginInput } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import { getAstroFrontmatter, type MdastVisitorContext } from './satteriAstroData';

/**
 * Calculates reading time and injects it into the Astro frontmatter bag for
 * templates (read via `remarkPluginFrontmatter`).
 *
 * Returned as a factory so the text accumulator resets per document. Sätteri
 * has no end-of-document hook, so text is accumulated across literal nodes and
 * the reading time is recomputed as it grows; the final visit leaves the
 * correct value on the frontmatter.
 */
export function satteriReadingTime(): MdastPluginInput {
  return () => {
    let text = '';

    const accumulate = (value: string, ctx: MdastVisitorContext) => {
      text += `${value} `;
      const frontmatter = getAstroFrontmatter(ctx);
      if (!frontmatter) return;
      const readingTime = getReadingTime(text);
      frontmatter.minutesRead = readingTime.text;
      frontmatter.readingTimeMinutes = readingTime.minutes;
    };

    return defineMdastPlugin({
      name: 'astro-reading-time',
      text: (node, ctx) => accumulate(node.value, ctx),
      inlineCode: (node, ctx) => accumulate(node.value, ctx),
      code: (node, ctx) => accumulate(node.value, ctx),
    });
  };
}
