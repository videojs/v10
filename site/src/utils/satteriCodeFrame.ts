import type { MdastContent } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import type { MdastVisitorContext } from './satteriAstroData';

const TITLE_RE = /title=(?:"([^"]+)"|'([^']+)'|([^\s"']+))/;

/**
 * Wraps each standalone fenced code block in a `<CodeFrame>` component so it
 * renders with a filename/language header and a copy button.
 *
 * This runs at the MDAST stage rather than as a `pre`/`code` component override
 * because Shiki rewrites each `<pre>` into raw HTML before any HAST plugin or
 * component override runs — wrapping the node here keeps a real component frame
 * around the still-highlighted code.
 *
 * Code blocks already inside an authored `<TabsPanel>` are left untouched: the
 * tab group is their frame. The title comes from the fence meta
 * (e.g. ```ts title="App.ts"```).
 */
export function satteriCodeFrame() {
  return defineMdastPlugin({
    name: 'astro-code-frame',
    code: (node, ctx) => {
      // Skip blocks framed by an authored tab group.
      let ancestor: ReturnType<MdastVisitorContext['parent']> = ctx.parent(node);
      while (ancestor) {
        if (ancestor.type === 'mdxJsxFlowElement' && ancestor.name === 'TabsPanel') return;
        ancestor = ctx.parent(ancestor);
      }

      const titleMatch = node.meta?.match(TITLE_RE);
      const title = titleMatch ? (titleMatch[1] ?? titleMatch[2] ?? titleMatch[3]) : undefined;

      const attributes = [{ type: 'mdxJsxAttribute', name: 'lang', value: node.lang ?? '' }];
      if (title) attributes.push({ type: 'mdxJsxAttribute', name: 'title', value: title });

      ctx.wrapNode(node, {
        type: 'mdxJsxFlowElement',
        name: 'CodeFrame',
        attributes,
        children: [],
      } as MdastContent);
    },
  });
}
