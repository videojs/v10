/**
 * Shared Tailwind class strings for typography elements.
 *
 * Used by both the Astro typography components and `renderInlineMarkdown`
 * so styling stays in sync across server-rendered MDX and programmatic
 * HTML generation.
 */
export const shared = {
  a: 'underline intent:no-underline',
  // TODO(old-color): light-100, dark-110, light-100, light-40, dark-80
  code: 'border border-manila-75 bg-manila-25 dark:border-dark-80 px-1 rounded font-mono text-code normal-case',
  codeBlock: 'font-mono text-code',
  em: 'font-bold',
  li: 'text-p2',
  ol: 'list-decimal list-outside pl-6 space-y-1',
  strong: 'font-bold',
  ul: 'list-disc list-outside pl-6 space-y-1',
} as const;
