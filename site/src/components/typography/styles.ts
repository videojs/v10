/**
 * Shared Tailwind class strings for typography elements.
 *
 * Used by both the Astro typography components and `renderInlineMarkdown`
 * so styling stays in sync across server-rendered MDX and programmatic
 * HTML generation.
 */
export const shared = {
  a: 'underline intent:no-underline',
  code: 'bg-light-100 dark:bg-dark-110 dark:text-light-100 border border-light-40 dark:border-dark-80 px-1 rounded font-mono text-code',
  codeBlock: 'font-mono text-code',
  em: 'font-medium',
  li: 'text-base',
  ol: 'list-decimal list-outside pl-6 space-y-1',
  strong: 'font-semibold',
  ul: 'list-disc list-outside pl-6 space-y-1',
} as const;
