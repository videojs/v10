import type { MdastContent } from 'satteri';
import { defineMdastPlugin } from 'satteri';

const TITLE_RE = /title=(?:"([^"]+)"|'([^']+)'|([^\s"']+))/;

/**
 * Sätteri MDAST plugin that wraps standalone fenced code blocks in a
 * `<CodeFrame>` component so they render with the filename/language header and
 * copy button. Replaces the former `rehypePrepareCodeBlocks`.
 *
 * Under Sätteri the highlight step rewrites each `<pre>` into raw HTML before
 * HAST plugins run, so the old `<pre>`/`<code>` component overrides never fire.
 * Wrapping at the MDAST stage keeps the frame as a real component while Sätteri
 * still highlights the inner code.
 *
 * Code blocks already inside an authored `<TabsPanel>` are left untouched — the
 * tab group provides their frame, matching the previous `hasFrame` behaviour.
 * The title is read from the fence meta (e.g. ```ts title="App.ts"```), which
 * makes the old `shikiTransformMetadata` transformer unnecessary.
 */
export function satteriCodeFrame() {
  return defineMdastPlugin({
    name: 'astro-code-frame',
    code: (node, ctx) => {
      // Skip blocks framed by an authored tab group.
      let ancestor = ctx.parent(node);
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
