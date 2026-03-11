import type { Config } from '@netlify/edge-functions';

export default async (request: Request) => {
  const url = new URL(request.url);
  const redirectUrl = new URL(url.pathname.replace(/\/$/, ''), url.origin);
  redirectUrl.search = url.search;
  redirectUrl.hash = url.hash;

  return new Response(null, {
    status: 301,
    headers: {
      location: redirectUrl.toString(),
      'cache-control': 'public, max-age=86400',
    },
  });
};

export const config: Config = {
  cache: 'manual',
  pattern: '.+/$',
};
