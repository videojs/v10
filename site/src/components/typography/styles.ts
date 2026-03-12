/**
 * Shared Tailwind class strings for typography elements.
 *
 * Used by both the Astro typography components and `renderInlineMarkdown`
 * so styling stays in sync across server-rendered MDX and programmatic
 * HTML generation.
 */
export const shared = {
  a: 'underline intent:no-underline',
  code: 'border border-manila-75 bg-manila-25 dark:bg-soot dark:border-warm-gray px-1 rounded font-mono text-code normal-case',
  codeBlock: 'font-mono text-code',
  em: 'italic',
  li: 'text-p2',
  ol: 'list-decimal list-outside pl-4 space-y-1',
  strong: 'font-bold',
  ul: 'list-disc list-outside pl-4 space-y-1',
} as const;
