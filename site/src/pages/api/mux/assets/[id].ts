import type { APIRoute } from 'astro';
import { createMuxClient, getValidToken } from '../../../../lib/mux-client';

export const prerender = false;

// GET /api/mux/assets/:id - Get a single asset by ID
export const GET: APIRoute = async ({ cookies, params }) => {
  try {
    const token = await getValidToken(cookies);

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Asset ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mux = createMuxClient(token);
    const asset = await mux.video.assets.retrieve(id);

    return new Response(JSON.stringify(asset), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch asset',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// DELETE /api/mux/assets/:id - Delete an asset
export const DELETE: APIRoute = async ({ cookies, params }) => {
  try {
    const token = await getValidToken(cookies);

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Asset ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mux = createMuxClient(token);
    await mux.video.assets.delete(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete asset',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
