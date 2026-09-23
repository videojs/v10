import type { Config } from '@netlify/edge-functions';

import { handleMarkdown } from './markdown-handler';

export default handleMarkdown;

export const config: Config = {
  cache: 'manual',
  // Plain HTML requests never reach this function, so their responses carry no `Vary: Accept`. Adding it site-wide
  // would make browsers miss prefetched pages, whose `Accept` differs from the navigation's; Netlify's cache already
  // keeps the two representations apart because it routes on this header match before its cache lookup.
  excludedPath: [
    '/blog/*.md',
    '/changelog/*.md',
    '/docs/*.md',
    '/html5-video-support.md',
    '/about-this-player.md',
  ],
  // Netlify tests this regex against the header value without flags, so it spells out both cases. It only narrows
  // which requests reach the function; prefersMarkdown weighs the q-values.
  header: {
    accept: '[Tt][Ee][Xx][Tt]/[Mm][Aa][Rr][Kk][Dd][Oo][Ww][Nn]',
  },
  method: 'GET',
  path: ['/blog/*', '/changelog/*', '/docs/*', '/html5-video-support', '/about-this-player'],
};
