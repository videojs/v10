import type { Config } from '@netlify/edge-functions';

import { handleMarkdown } from './markdown-handler';

export default handleMarkdown;

export const config: Config = {
  cache: 'manual',
  method: 'GET',
  path: [
    '/blog/*.md',
    '/changelog/*.md',
    '/docs/*.md',
    '/errors/*.md',
    '/html5-video-support.md',
    '/about-this-player.md',
  ],
};
