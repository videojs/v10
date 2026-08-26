import { defineMdastPlugin } from 'satteri';

import { VJS10_HTML_CDN_BASE } from '../consts';

export const VJS10_HTML_CDN_PLACEHOLDER = '{{VJS10_HTML_CDN_BASE}}';

/** Replace CDN placeholders in documentation code with the current package version. */
export function satteriCdnVersion() {
  return defineMdastPlugin({
    name: 'videojs-cdn-version',
    code: (node, ctx) => {
      if (!node.value.includes(VJS10_HTML_CDN_PLACEHOLDER)) return;

      ctx.replaceNode(node, {
        ...node,
        value: node.value.replaceAll(VJS10_HTML_CDN_PLACEHOLDER, VJS10_HTML_CDN_BASE),
      });
    },
    inlineCode: (node, ctx) => {
      if (!node.value.includes(VJS10_HTML_CDN_PLACEHOLDER)) return;

      ctx.replaceNode(node, {
        ...node,
        value: node.value.replaceAll(VJS10_HTML_CDN_PLACEHOLDER, VJS10_HTML_CDN_BASE),
      });
    },
  });
}
