import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_TITLE } from '@/consts';

export async function GET(context) {
  const entries = (await getCollection('changelog')).sort(
    (a, b) =>
      b.data.date.valueOf() - a.data.date.valueOf() ||
      b.data.version.localeCompare(a.data.version, undefined, { numeric: true })
  );

  return rss({
    title: `${SITE_TITLE} Changelog`,
    description: 'New features, fixes, and improvements in every Video.js release',
    site: context.site,
    trailingSlash: false,
    items: entries.map((entry) => ({
      title: `v${entry.data.version}`,
      pubDate: entry.data.date,
      description: entry.data.description || undefined,
      link: `/changelog/${entry.id}`,
    })),
  });
}
