export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Clear session cookies
  cookies.delete('session', { path: '/' });
  cookies.delete('refresh_token', { path: '/' });

  return redirect('/', 302);
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Also support GET for simple logout links
  cookies.delete('session', { path: '/' });
  cookies.delete('refresh_token', { path: '/' });

  return redirect('/', 302);
};
