import { renderInstallationPlanSections, renderSelectionErrors } from '@videojs/installation';

import { VJS10_VERSION } from '../../src/consts';
import {
  INSTALLATION_MARKDOWN_PARAMS,
  replaceInstallationMarkdownPlan,
  resolveInstallationMarkdownPlan,
} from '../../src/utils/installation/markdown';

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
  next(request: Request): Promise<Response>;
}

export async function handleMarkdown(request: Request, context: MarkdownContext): Promise<Response | undefined> {
  const url = new URL(request.url);
  const directMarkdown = url.pathname.endsWith('.md');
  const acceptsMarkdown = request.headers.get('accept')?.includes('text/markdown') ?? false;
  if (!directMarkdown && !acceptsMarkdown) return;

  const path = (directMarkdown ? url.pathname.slice(0, -3) : url.pathname).replace(/\/$/, '');
  const assetUrl = new URL(`${path}.md`, request.url);

  assetUrl.search = '';

  // Continue through Netlify's current request chain so the static asset is served without starting a new
  // same-origin request that would run this edge function again.
  const assetRequest = directMarkdown ? request : new Request(assetUrl, request);
  const mdResponse = await context.next(assetRequest);
  if (!mdResponse.ok) return;

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
