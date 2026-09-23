import { renderInstallationPlanSections, renderSelectionErrors } from '@videojs/installation';

import htmlPackage from '../../../../packages/html/package.json' with { type: 'json' };
import {
  INSTALLATION_MARKDOWN_PARAMS,
  replaceInstallationMarkdownPlan,
  resolveInstallationMarkdownPlan,
} from './markdown.ts';

const VJS10_VERSION = htmlPackage.version;
// RFC 9110 qvalue: 0 to 1 with at most three decimals.
const QVALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

/** Whether an Accept header explicitly prefers Markdown to HTML. */
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

function markdownResponse(body: string, status = 200, privateResponse = false): Response {
  const headers = new Headers();

  headers.set('content-type', 'text/markdown; charset=utf-8');
  headers.set('cache-control', privateResponse ? 'private, no-store' : 'public, s-maxage=31536000');
  headers.set('netlify-vary', `query=${[...INSTALLATION_MARKDOWN_PARAMS].join('|')}`);
  headers.set('vary', 'Accept');
  headers.set('x-markdown-tokens', String(Math.ceil(body.length / 4)));

  return new Response(body, { status, headers });
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

  let body = await mdResponse.text();
  const hasInstallationSelection = [...url.searchParams].some(([key]) => INSTALLATION_MARKDOWN_PARAMS.has(key));
  const result = hasInstallationSelection
    ? resolveInstallationMarkdownPlan(path, url.searchParams, VJS10_VERSION)
    : null;

  if (result) {
    if (!result.ok) return markdownResponse(`${renderSelectionErrors(result.errors)}\n`, 400, true);

    const replaced = replaceInstallationMarkdownPlan(body, renderInstallationPlanSections(result.plan));

    if (!replaced) {
      return markdownResponse('The installation guide is missing its generated installation section.\n', 500, true);
    }

    body = replaced;
  }

  return markdownResponse(body, 200, url.searchParams.has('source-url'));
}
