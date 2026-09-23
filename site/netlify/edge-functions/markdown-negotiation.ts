import type { Config, Context } from '@netlify/edge-functions';

// RFC 9110 qvalue: 0 to 1 with at most three decimals.
const QVALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

/**
 * Whether an `Accept` header prefers a page's Markdown twin to its HTML. Markdown needs an explicit `text/markdown`
 * range with a quality above zero and at least as high as HTML's, which falls back to `text/*` and then to the full
 * wildcard. A tie goes to Markdown because only Markdown-aware clients name it; wildcards alone keep the HTML. Media
 * ranges compare case-insensitively, and a range with a malformed `q` is ignored.
 */
export function prefersMarkdown(accept: string): boolean {
  const qualities = new Map<string, number>();

  for (const entry of accept.split(',')) {
    const [range = '', ...params] = entry.split(';').map((part) => part.trim().toLowerCase());
    const weight = params.find((param) => param.startsWith('q='))?.slice(2) ?? '1';
    if (!QVALUE.test(weight)) continue;

    qualities.set(range, Math.max(Number(weight), qualities.get(range) ?? 0));
  }

  const markdown = qualities.get('text/markdown') ?? 0;
  const html = qualities.get('text/html') ?? qualities.get('text/*') ?? qualities.get('*/*') ?? 0;

  return markdown > 0 && markdown >= html;
}

/** Serves a page's prebuilt `.md` twin to requests that prefer Markdown and passes every other request through. */
export default async function markdownNegotiation(request: Request, context: Pick<Context, 'next'>) {
  // trailing-slash.ts redirects slash URLs to the canonical page URL, which is where negotiation happens.
  const url = new URL(request.url);
  if (url.pathname.endsWith('/')) return;

  if (!prefersMarkdown(request.headers.get('accept') ?? '')) return varyOnAccept(await context.next());

  // A moved page's twin redirects along with it. Rather than following that redirect, fall through to the page's own
  // so the client negotiates again at the new address; a missing twin falls through to the page the same way.
  const twin = await fetch(new URL(`${url.pathname}.md`, url), { redirect: 'manual' });
  if (!twin.ok) return varyOnAccept(await context.next());

  const body = await twin.text();

  const headers = new Headers();

  headers.set('content-type', 'text/markdown; charset=utf-8');
  headers.set('cache-control', 'public, s-maxage=31536000');
  headers.set('vary', 'Accept');
  headers.set('x-markdown-tokens', String(Math.ceil(body.length / 4)));

  return new Response(body, { status: 200, headers });
}

// Whichever representation wins, this function chose it from Accept, so caches must key on it.
function varyOnAccept(response: Response): Response {
  const vary = response.headers.get('vary') ?? '';
  const fields = vary.split(',').map((field) => field.trim().toLowerCase());

  if (!fields.includes('accept') && !fields.includes('*')) response.headers.append('vary', 'Accept');

  return response;
}

export const config: Config = {
  // https://docs.netlify.com/build/edge-functions/optional-configuration/#caching
  cache: 'manual',
  // Plain HTML requests never reach this function, so their responses carry no `Vary: Accept`. Adding it site-wide
  // would make browsers miss prefetched pages, whose `Accept` differs from the navigation's; Netlify's cache already
  // keeps the two representations apart because it routes on this header match before its cache lookup.
  path: ['/blog/*', '/changelog/*', '/docs/*', '/errors/*', '/html5-video-support', '/about-this-player'],
  // Netlify tests this regex against the header value without flags, so it spells out both cases. It only narrows
  // which requests reach the function; prefersMarkdown weighs the q-values.
  header: {
    accept: '[Tt][Ee][Xx][Tt]/[Mm][Aa][Rr][Kk][Dd][Oo][Ww][Nn]',
  },
};
