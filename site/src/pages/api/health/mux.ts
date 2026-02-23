import { actions } from 'astro:actions';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { data, error } = await context.callAction(actions.mux.health, {});

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 502 });
  }

  return Response.json(data);
};
