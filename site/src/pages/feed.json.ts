import type { APIRoute } from 'astro';
import { BLOG_FEED } from '@/utils/feeds/feedChannels';
import { buildBlogFeedItems } from '@/utils/feeds/feedItems';
import { buildJsonFeed, jsonFeedResponse } from '@/utils/feeds/jsonFeed';

export const GET: APIRoute = async (context) => {
  const site = new URL(context.site as URL);
  const items = await buildBlogFeedItems(site, { includeDevOnly: import.meta.env.DEV });

  return jsonFeedResponse(buildJsonFeed(BLOG_FEED.jsonMetadata(site), items));
};
