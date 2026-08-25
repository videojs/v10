import type { APIRoute } from 'astro';

import { renderOgImage } from '@/utils/og/render-og-image';
import { getOgCacheHeaders, resolveOgRequest } from '@/utils/og/resolve-og-request';

export const prerender = false;

const imagePromiseCache = new Map<string, Promise<Buffer>>();

function getCachedOgImage(cacheKey: string, title: string, size: 'og' | 'twitter'): Promise<Buffer> {
  let pngPromise = imagePromiseCache.get(cacheKey);

  if (!pngPromise) {
    pngPromise = renderOgImage({ title, size }).catch((error) => {
      imagePromiseCache.delete(cacheKey);
      throw error;
    });
    imagePromiseCache.set(cacheKey, pngPromise);
  }

  return pngPromise;
}

export const GET: APIRoute = async ({ params }) => {
  // Dynamic mode intentionally uses a whitelist of known site paths instead of
  // allowing arbitrary title or slug inputs.
  const ogRequest = await resolveOgRequest(params.path);

  if (!ogRequest) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    });
  }

  const cacheKey = `${ogRequest.size}:${ogRequest.sitePath}`;
  const png = await getCachedOgImage(cacheKey, ogRequest.title, ogRequest.size);

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      ...getOgCacheHeaders(),
    },
  });
};
