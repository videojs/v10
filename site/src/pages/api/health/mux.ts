import type { APIRoute } from 'astro';
import { actions } from 'astro:actions';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { data, error } = await context.callAction(actions.mux.health, {});
  if (error) return Response.json({ ok: false, error: error.message }, { status: 502 });

  return Response.json(data);
};
