import type { APIRoute } from 'astro';
import { authorizationCode, INACTIVITY_EXPIRY, seal, SESSION_COOKIE_NAME } from '@/utils/auth';

export const prerender = false;

const { OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI, OAUTH_URL } = import.meta.env;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Verify state to prevent CSRF
  const storedState = cookies.get('state')?.value;

  if (!state || state !== storedState) {
    return new Response('Invalid state parameter', { status: 400 });
  }

  // Clear state cookie
  cookies.delete('state', { path: '/' });

  if (!code) {
    return new Response('Authorization code missing', { status: 400 });
  }

  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REDIRECT_URI || !OAUTH_URL) {
    return new Response('OAuth configuration missing', { status: 500 });
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

    return redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
};
