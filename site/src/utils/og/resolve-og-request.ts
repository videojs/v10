import type { OgSize } from '@/utils/og/render-og-image';
import { buildOgTitleMap } from '@/utils/og/title-entries';

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
