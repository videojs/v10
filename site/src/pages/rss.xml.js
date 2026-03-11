import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/consts';

// TODO cache idk this can be static
export async function GET(context) {
  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.devOnly || import.meta.env.DEV)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    trailingSlash: false,
    items: posts.map((post) => ({
      ...post.data,
      link: `/blog/${post.id}`,
    })),
  });
}
