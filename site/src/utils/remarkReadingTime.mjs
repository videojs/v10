import { toString as mdastToString } from 'mdast-util-to-string';
import getReadingTime from 'reading-time';

/**
 * Remark plugin that calculates reading time for markdown/MDX content.
 * Injects the reading time into remarkPluginFrontmatter for use in templates.
 * adapted from https://docs.astro.build/en/recipes/reading-time/
 */
export function remarkReadingTime() {
  return (tree, { data }) => {
    const textOnPage = mdastToString(tree);
    const readingTime = getReadingTime(textOnPage);

    // Inject reading time into frontmatter
    data.astro.frontmatter.minutesRead = readingTime.text;

    // Also provide the numeric minutes value for easier access
    data.astro.frontmatter.readingTimeMinutes = readingTime.minutes;
  };
}
