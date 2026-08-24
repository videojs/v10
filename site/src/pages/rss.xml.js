import rss from '@astrojs/rss';
import { BLOG_FEED } from '@/utils/feeds/feedChannels';
import { buildBlogFeedItems } from '@/utils/feeds/feedItems';
import { buildChannelCustomData, RSS_NAMESPACES, toRssItems } from '@/utils/feeds/rssFeed';

// TODO cache idk this can be static
export async function GET(context) {
  const site = new URL(context.site);
  const items = await buildBlogFeedItems(site, { includeDevOnly: import.meta.env.DEV });

  return rss({
    title: BLOG_FEED.title,
    description: BLOG_FEED.description,
    site: context.site,
    trailingSlash: false,
    xmlns: RSS_NAMESPACES,
    customData: buildChannelCustomData({
      ...BLOG_FEED.rssMetadata(site),
      lastBuildDate: items[0]?.datePublished,
    }),
    items: toRssItems(items),
  });
}
