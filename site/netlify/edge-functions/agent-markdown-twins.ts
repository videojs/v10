import type { Config } from '@netlify/edge-functions';

import { type CounterContext, recordMarkdownFetch } from '../../src/utils/agent-analytics.ts';

/**
 * Counts reads of the `.md` twins and `llms.txt`. It sets no `cache`, unlike the Markdown functions, so it runs on
 * every request, including the ones Netlify's cache answers for them. It only observes: the response passes through as
 * is.
 */
export default async function agentMarkdownTwins(request: Request, context: CounterContext) {
  const response = await context.next();

  recordMarkdownFetch(request, response, context, new URL(request.url).pathname === '/llms.txt' ? 'llms' : 'twin');

  return response;
}

export const config: Config = {
  method: 'GET',
  onError: 'bypass',
  path: ['/*.md', '/llms.txt'],
};
