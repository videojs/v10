import type { SharedProps } from './Shared';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import tsx from 'shiki/langs/tsx.mjs';

import createHighlighter from './createHighlighter';
import Shared from './Shared';

// eslint-disable-next-line antfu/no-top-level-await
const clientHighlighter = await createHighlighter({
  langs: [html, tsx, css, javascript],
});

/**
 * Renders HTML, TSX, CSS, and JavaScript. A strict subset, for lighter-weight client shipping
 *
 * Renders with top-level await, so, it's safe for ssr (client:idle or client:load or client:visible)
 * However, if you try importing more than one island with ClientCode in it,
 * Safari MAY throw a hydration error because of this top-level await.
 * https://github.com/withastro/astro/issues/10055
 * consolidate the ClientCodes into a single island to work around... for now :(
 */
export default function ClientCode(props: Omit<SharedProps, 'highlighter'>) {
  return <Shared {...props} highlighter={clientHighlighter} />;
}
