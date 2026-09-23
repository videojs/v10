import type { Config } from '@netlify/edge-functions';

import { handleMarkdown } from '../../src/utils/markdown-handler.ts';

export default handleMarkdown;

export const config: Config = {
  cache: 'manual',
  method: 'GET',
  // Netlify requires inline static config values. Keep these routes aligned with markdown-negotiation.
  path: ['/blog/*.md', '/changelog/*.md', '/docs/*.md', '/html5-video-support.md', '/about-this-player.md'],
};
