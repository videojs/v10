import { getCollection } from 'astro:content';

import { SUPPORTED_FRAMEWORKS } from '@/types/docs';
import { filterSidebar, getAllGuideSlugs } from '@/utils/docs/sidebar';
import { getDocTitle } from '@/utils/docs/title';
import type { OgSize } from '@/utils/og/render-og-image';

const STATIC_PAGES: { path: string; title: string }[] = [
  { path: 'index', title: 'The open source player for the web' },
  { path: 'support', title: 'Support' },
  { path: 'privacy', title: 'Privacy' },
  { path: 'blog', title: 'Blog' },
];

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

type OgTitleMap = Map<string, string>;

export interface ResolvedOgRequest {
  size: OgSize;
  sitePath: string;
  title: string;
}

let ogTitleMapPromise: Promise<OgTitleMap> | null = null;

function normalizeSitePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '') || 'index';
}

function addOgTitle(titleMap: OgTitleMap, path: string, title: string): void {
  const normalizedPath = normalizeSitePath(path);
  const existingTitle = titleMap.get(normalizedPath);

  if (existingTitle && existingTitle !== title) {
    throw new Error(
      `Duplicate OG image path "${normalizedPath}" maps to multiple titles: ` + `"${existingTitle}" and "${title}".`
    );
  }

  titleMap.set(normalizedPath, title);
}

async function buildOgTitleMap(): Promise<OgTitleMap> {
  const titleMap: OgTitleMap = new Map();

  for (const { path, title } of STATIC_PAGES) {
    addOgTitle(titleMap, path, title);
  }

  const blogPosts = (await getCollection('blog')).filter((post) => !post.data.devOnly || import.meta.env.DEV);

  for (const post of blogPosts) {
    addOgTitle(titleMap, `blog/${post.id}`, post.data.ogTitle ?? post.data.title);
  }

  const totalBlogPages = Math.ceil(blogPosts.length / 10);

  for (let page = 2; page <= totalBlogPages; page += 1) {
    addOgTitle(titleMap, `blog/${page}`, 'Blog');
  }

  const authors = await getCollection('authors');

  for (const author of authors) {
    addOgTitle(titleMap, `blog/authors/${author.id}`, author.data.name);
  }

  const docsCollection = await getCollection('docs');

  for (const framework of SUPPORTED_FRAMEWORKS) {
    const allowedSlugs = new Set(getAllGuideSlugs(filterSidebar(framework)));

    for (const doc of docsCollection) {
      if (!allowedSlugs.has(doc.id)) {
        continue;
      }

      addOgTitle(titleMap, `docs/framework/${framework}/${doc.id}`, doc.data.ogTitle ?? getDocTitle(doc, framework));
    }
  }

  return titleMap;
}

async function getOgTitleMap(): Promise<OgTitleMap> {
  if (!ogTitleMapPromise) {
    ogTitleMapPromise = buildOgTitleMap().catch((error) => {
      ogTitleMapPromise = null;
      throw error;
    });
  }

  return ogTitleMapPromise;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function parseOgRequestPath(pathParam: string | undefined): { size: OgSize; sitePath: string } | null {
  if (!pathParam) {
    return null;
  }

  const rawSegments = pathParam
    .replace(/\.png$/i, '')
    .split('/')
    .filter(Boolean)
    .map(decodePathSegment);

  if (rawSegments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }

  const size: OgSize = rawSegments[0] === 'twitter' ? 'twitter' : 'og';
  const siteSegments = size === 'twitter' ? rawSegments.slice(1) : rawSegments;

  if (siteSegments.length === 0) {
    return null;
  }

  return {
    size,
    sitePath: normalizeSitePath(siteSegments.join('/')),
  };
}

export async function resolveOgRequest(pathParam: string | undefined): Promise<ResolvedOgRequest | null> {
  const parsedRequest = parseOgRequestPath(pathParam);

  if (!parsedRequest) {
    return null;
  }

  const titleMap = await getOgTitleMap();
  const title = titleMap.get(parsedRequest.sitePath);

  if (!title) {
    return null;
  }

  return {
    ...parsedRequest,
    title,
  };
}

export function getOgCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'CDN-Cache-Control': `public, max-age=${ONE_YEAR_IN_SECONDS}`,
    // Netlify automatically invalidates function-response cache on new deploys,
    // so a long-lived durable cache here means "cache until the next release."
    'Netlify-CDN-Cache-Control': `public, durable, max-age=${ONE_YEAR_IN_SECONDS}`,
  };
}
