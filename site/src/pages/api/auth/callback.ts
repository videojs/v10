import type { APIRoute } from 'astro';

import { authorizationCode, INACTIVITY_EXPIRY, seal, SESSION_COOKIE_NAME } from '@/utils/auth';

export const prerender = false;

const { OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI, OAUTH_URL } = import.meta.env;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REDIRECT_URI || !OAUTH_URL) {
    console.error('OAuth configuration missing');

    return redirect('/auth/error');
  }

  // Verify state to prevent CSRF
  const storedState = cookies.get('state')?.value;

  if (!state || state !== storedState) {
    console.error('Invalid state parameter');

    return redirect('/auth/error');
  }

  // Clear state cookie
  cookies.delete('state', { path: '/' });

  if (!code) {
    console.error('Authorization code missing');
    return redirect('/auth/error');
  }

  try {
    // Exchange authorization code for access token
    const tokens = await authorizationCode(code);
    const encryptedSession = await seal(tokens);

    cookies.set(SESSION_COOKIE_NAME, encryptedSession, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: INACTIVITY_EXPIRY,
      path: '/',
    });

    return redirect('/auth/success');
  } catch (error) {
    console.error('OAuth callback error:', error);

    return redirect('/auth/error');
  }
};
