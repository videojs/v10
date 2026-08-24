import type { APIRoute } from 'astro';
import { CHANGELOG_FEED } from '@/utils/feeds/feedChannels';
import { buildChangelogFeedItems } from '@/utils/feeds/feedItems';
import { buildJsonFeed, jsonFeedResponse } from '@/utils/feeds/jsonFeed';

export const GET: APIRoute = async (context) => {
  const site = new URL(context.site as URL);
  const items = await buildChangelogFeedItems(site);

  return jsonFeedResponse(buildJsonFeed(CHANGELOG_FEED.jsonMetadata(site), items));
};
