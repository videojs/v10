import type { Config } from '@netlify/edge-functions';

import { handleMarkdown } from '../../src/utils/markdown-handler.ts';
import { MARKDOWN_ASSET_PATHS } from './markdown-paths.ts';

export default handleMarkdown;

export const config: Config = {
  cache: 'manual',
  method: 'GET',
  path: [...MARKDOWN_ASSET_PATHS],
};
