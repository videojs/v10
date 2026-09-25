import htmlPackage from '../../../packages/html/package.json' with { type: 'json' };
import { INSTALLATION_MARKDOWN_PARAMS, renderInstallationMarkdownSelection } from './installation/markdown.ts';

const VJS10_VERSION = htmlPackage.version;
const INSTALLATION_PATH = '/docs/guides/installation/';
// RFC 9110 qvalue: 0 to 1 with at most three decimals.
const QVALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

/**
 * Whether an Accept header explicitly permits Markdown and gives it at least HTML's quality. Markdown wins an exact
 * tie; wildcards can supply HTML's quality but never opt a request into Markdown on their own.
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

// Netlify purges its CDN on every deploy, which is when the Markdown and its package version change, so only its cache
// keeps the long TTL. Browsers and other shared caches revalidate.
function setPublicMarkdownCache(headers: Headers): void {
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('netlify-cdn-cache-control', 'public, s-maxage=31536000');
}

function markMarkdownResponse(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set('content-type', 'text/markdown; charset=utf-8');
  setPublicMarkdownCache(headers);
  headers.set('vary', 'Accept');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function installationMarkdownResponse(body: string, status: 200 | 400 | 500, privateResponse: boolean): Response {
  const response = new Response(body, { status });

  response.headers.set('content-type', 'text/markdown; charset=utf-8');

  if (privateResponse) response.headers.set('cache-control', 'private, no-store');
  else setPublicMarkdownCache(response.headers);

  response.headers.set('netlify-vary', `query=${[...INSTALLATION_MARKDOWN_PARAMS].join('|')}`);
  response.headers.set('vary', 'Accept');
  response.headers.set('x-markdown-tokens', String(Math.ceil(body.length / 4)));

  return response;
}

export interface MarkdownContext {
  next(request?: Request): Promise<Response>;
}

export async function handleMarkdown(request: Request, context: MarkdownContext): Promise<Response | undefined> {
  const url = new URL(request.url);
  const directMarkdown = url.pathname.endsWith('.md');
  const acceptsMarkdown = prefersMarkdown(request.headers.get('accept') ?? '');
  if (!directMarkdown && !acceptsMarkdown) return;

  const path = (directMarkdown ? url.pathname.slice(0, -3) : url.pathname).replace(/\/$/, '');
  const assetUrl = new URL(`${path}.md`, request.url);

  assetUrl.search = '';

  // Continue through Netlify's current request chain so the static asset is served without starting a new
  // same-origin request that would run this edge function again.
  const assetRequest = directMarkdown ? request : new Request(assetUrl, request);
  const mdResponse = await context.next(assetRequest);
  if (!mdResponse.ok) return directMarkdown ? mdResponse : undefined;

  // Only installation twins vary their generated body by query parameters. Return every other static twin as a
  // stream so the edge function does not buffer every documentation page or attach installation cache metadata.
  if (!path.startsWith(INSTALLATION_PATH)) return markMarkdownResponse(mdResponse);

  const body = await mdResponse.text();
  const installation = renderInstallationMarkdownSelection(body, path, url.searchParams, VJS10_VERSION);

  if (!installation) {
    return markMarkdownResponse(
      new Response(body, {
        status: mdResponse.status,
        statusText: mdResponse.statusText,
        headers: mdResponse.headers,
      })
    );
  }

  return installationMarkdownResponse(installation.body, installation.status, installation.privateResponse);
}
