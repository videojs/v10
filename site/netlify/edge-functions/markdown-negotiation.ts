import type { Config, Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  // Fetch the pre-built .md file from static assets
  const mdResponse = await fetch(new URL(`${path}.md`, request.url));
  if (!mdResponse.ok) return;

  const body = await mdResponse.text();

  const headers = new Headers();
  headers.set('content-type', 'text/markdown; charset=utf-8');
  headers.set('vary', 'Accept');
  headers.set('x-markdown-tokens', String(Math.ceil(body.length / 4)));

  return new Response(body, { status: 200, headers });
};

export const config: Config = {
  path: ['/blog/*', '/docs/*'],
  header: {
    accept: 'text/markdown',
  },
};
