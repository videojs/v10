import { getCollection } from 'astro:content';
import type { GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { SUPPORTED_FRAMEWORKS } from '@/types/docs';
import { filterSidebar, getAllGuideSlugs } from '@/utils/docs/sidebar';
import { getDocTitle } from '@/utils/docs/title';
import type { OgSize } from '@/utils/og/render-og-image';
import { renderOgImage } from '@/utils/og/render-og-image';

// To switch to dynamic/runtime generation:
// 1. Change to `export const prerender = false;`
// 2. Parse `title` and `size` from the URL path instead of Astro.props
export const prerender = true;

// ---------------------------------------------------------------------------
// Static pages (not from content collections)
// ---------------------------------------------------------------------------

const STATIC_PAGES: { path: string; title: string }[] = [
  { path: 'index', title: 'The open source player for the web' },
  { path: 'support', title: 'Support' },
  { path: 'privacy', title: 'Privacy' },
  { path: 'blog', title: 'Blog' },
];

// ---------------------------------------------------------------------------
// getStaticPaths — emits OG + Twitter entries for every page
// ---------------------------------------------------------------------------

function emitBothSizes(
  path: string,
  title: string
): { params: { path: string }; props: { title: string; size: OgSize } }[] {
  return [
    { params: { path }, props: { title, size: 'og' } },
    { params: { path: `twitter/${path}` }, props: { title, size: 'twitter' } },
  ];
}

export const getStaticPaths = (async () => {
  // 1. Docs collection
  const docsCollection = await getCollection('docs');
  const docsPaths = SUPPORTED_FRAMEWORKS.flatMap((framework) => {
    const sidebarForFramework = filterSidebar(framework);
    const allowedSlugs = new Set(getAllGuideSlugs(sidebarForFramework));

    return docsCollection
      .filter((doc) => allowedSlugs.has(doc.id))
      .flatMap((doc) => {
        const title = doc.data.ogTitle ?? getDocTitle(doc, framework);
        return emitBothSizes(`docs/framework/${framework}/${doc.id}`, title);
      });
  });

  // 2. Blog posts
  const blogPosts = (await getCollection('blog')).filter((post) => !post.data.devOnly || import.meta.env.DEV);
  const blogPaths = blogPosts.flatMap((post) => {
    const title = post.data.ogTitle ?? post.data.title;
    return emitBothSizes(`blog/${post.id}`, title);
  });

  // 3. Blog authors
  const authors = await getCollection('authors');
  const authorPaths = authors.flatMap((author) => emitBothSizes(`blog/authors/${author.id}`, author.data.name));

  // 4. Static pages (including paginated blog listing)
  const totalBlogPages = Math.ceil(blogPosts.length / 10);
  const paginatedBlogPages = Array.from({ length: Math.max(0, totalBlogPages - 1) }, (_, i) => ({
    path: `blog/${i + 2}`,
    title: 'Blog',
  }));

  const staticPaths = [...STATIC_PAGES, ...paginatedBlogPages].flatMap(({ path, title }) => emitBothSizes(path, title));

  return [...docsPaths, ...blogPaths, ...authorPaths, ...staticPaths];
}) satisfies GetStaticPaths;

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: { props: Props }) {
  const { title, size } = context.props;
  const png = await renderOgImage({ title, size });

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
}
