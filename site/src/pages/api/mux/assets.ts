import type { APIRoute } from 'astro';
import { createMuxClient, getValidToken } from '../../../lib/mux-client';

export const prerender = false;

// GET /api/mux/assets - List all assets
// GET /api/mux/assets?limit=25&page=1 - List with pagination
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const token = await getValidToken(cookies);

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mux = createMuxClient(token);

    // Get pagination params from query string
    const limit = Number.parseInt(url.searchParams.get('limit') || '25');
    const page = Number.parseInt(url.searchParams.get('page') || '1');

    const assets = await mux.video.assets.list({
      limit,
      page,
    });

    return new Response(JSON.stringify(assets), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch assets',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// POST /api/mux/assets - Create a new asset
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const token = await getValidToken(cookies);

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mux = createMuxClient(token);
    const body = await request.json();

    // Create asset - expects body like:
    // { input: "https://example.com/video.mp4", playback_policy: ["public"] }
    const asset = await mux.video.assets.create(body);

    return new Response(JSON.stringify(asset), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating asset:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create asset',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
