import type { Config } from '@netlify/edge-functions';

import { handleMarkdown, type MarkdownContext, prefersMarkdown } from '../../src/utils/markdown-handler.ts';
import { MARKDOWN_ASSET_PATHS, MARKDOWN_PAGE_PATHS } from './markdown-paths.ts';

export { prefersMarkdown };

export default async function markdownNegotiation(request: Request, context: MarkdownContext) {
  // trailing-slash.ts redirects slash URLs to the canonical page URL, which is where negotiation happens.
  if (new URL(request.url).pathname.endsWith('/')) return;

  if (!prefersMarkdown(request.headers.get('accept') ?? '')) return varyOnAccept(await context.next());

  return (await handleMarkdown(request, context)) ?? varyOnAccept(await context.next());
}

// Whichever representation wins, this function chose it from Accept, so caches must key on it.
function varyOnAccept(response: Response): Response {
  const vary = response.headers.get('vary') ?? '';
  const fields = vary.split(',').map((field) => field.trim().toLowerCase());

  if (!fields.includes('accept') && !fields.includes('*')) response.headers.append('vary', 'Accept');

  return response;
}

export const config: Config = {
  cache: 'manual',
  // Plain HTML requests never reach this function, so their responses carry no `Vary: Accept`. Adding it site-wide
  // would make browsers miss prefetched pages, whose `Accept` differs from the navigation's; Netlify's cache already
  // keeps the two representations apart because it routes on this header match before its cache lookup.
  excludedPath: [...MARKDOWN_ASSET_PATHS],
  // Netlify tests this regex against the header value without flags, so it spells out both cases. It only narrows
  // which requests reach the function; prefersMarkdown weighs the q-values.
  header: {
    accept: '[Tt][Ee][Xx][Tt]/[Mm][Aa][Rr][Kk][Dd][Oo][Ww][Nn]',
  },
  method: 'GET',
  path: [...MARKDOWN_PAGE_PATHS],
};
