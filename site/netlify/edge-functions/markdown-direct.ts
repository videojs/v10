import type { Config } from '@netlify/edge-functions';

import { handleMarkdown } from '../../src/utils/markdown-handler.ts';

export default handleMarkdown;

export const config: Config = {
  cache: 'manual',
  method: 'GET',
  // Only installation twins vary by query; Netlify serves every other twin statically with the headers the build writes
  // to `_headers`. Netlify requires inline static config values, so this matches `getInstallationRoutePath`.
  path: '/docs/guides/installation/*.md',
};
