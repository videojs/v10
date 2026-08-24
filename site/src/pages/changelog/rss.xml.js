import rss from '@astrojs/rss';
import { CHANGELOG_FEED } from '@/utils/feeds/feedChannels';
import { buildChangelogFeedItems } from '@/utils/feeds/feedItems';
import { buildChannelCustomData, RSS_NAMESPACES, toRssItems } from '@/utils/feeds/rssFeed';

export async function GET(context) {
  const site = new URL(context.site);
  const items = await buildChangelogFeedItems(site);

  return rss({
    title: CHANGELOG_FEED.title,
    description: CHANGELOG_FEED.description,
    site: context.site,
    trailingSlash: false,
    xmlns: RSS_NAMESPACES,
    customData: buildChannelCustomData({
      ...CHANGELOG_FEED.rssMetadata(site),
      lastBuildDate: items[0]?.datePublished,
    }),
    items: toRssItems(items),
  });
}
