import type { CollectionEntry } from 'astro:content';
import { render } from 'astro:content';
import mdxRenderer from '@astrojs/mdx/server.js';
import reactRenderer from '@astrojs/react/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import FeedCodeFrame from '@/components/feed/CodeFrame.astro';
import { cleanFeedHtml } from './feedHtml';

/** Collections whose entries are published as full-content feed items. */
type FeedEntry = CollectionEntry<'blog'> | CollectionEntry<'changelog'>;

/**
 * Component overrides applied when rendering entry content for a feed. Only
 * components that would otherwise render as islands need an entry here: every
 * other element falls through to plain HTML, which is what feed readers want.
 */
const feedMarkdownComponents = { CodeFrame: FeedCodeFrame };

/**
 * Renders entry bodies to feed-ready HTML.
 *
 * The container is created once per feed request: it compiles the MDX renderer
 * chain, so re-creating it per entry would repeat that work for every item.
 */
export async function createFeedContentRenderer(site: URL) {
  const container = await AstroContainer.create();
  container.addServerRenderer({ name: '@astrojs/mdx', renderer: mdxRenderer });
  // Blog posts embed player demos. They are stripped from the feed, but the
  // renderer still has to be registered for the surrounding page to render.
  container.addServerRenderer({ name: '@astrojs/react', renderer: reactRenderer });
  container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' });

  return async function renderFeedContent(entry: FeedEntry): Promise<string> {
    const { Content } = await render(entry);
    const html = await container.renderToString(Content, {
      partial: true,
      props: { components: feedMarkdownComponents },
    });
    return cleanFeedHtml(html, site);
  };
}
