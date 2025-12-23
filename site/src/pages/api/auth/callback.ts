import type { APIRoute } from 'astro';

import { exchangeAuthorizationCode, INACTIVITY_EXPIRY, seal, SESSION_COOKIE_NAME } from '@/utils/auth';

/** Disable static pre-rendering - this endpoint requires runtime request handling */
export const prerender = false;

const { OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI, OAUTH_URL } = import.meta.env;

/**
 * OAuth 2.0 callback endpoint - handles the redirect from the authorization server
 *
 * Flow:
 * 1. Validates the state parameter to prevent CSRF attacks
 * 2. Exchanges the authorization code for access & refresh tokens
 * 3. Encrypts and stores tokens in a secure HTTP-only cookie
 * 4. Redirects to success or error page
 */
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Validate OAuth configuration is present
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REDIRECT_URI || !OAUTH_URL) {
    console.error('OAuth configuration missing');
    return redirect('/auth/error');
  }

  // Verify state parameter to prevent CSRF attacks
  const storedState = cookies.get('state')?.value;

  if (!state || state !== storedState) {
    console.error('Invalid state parameter');
    return redirect('/auth/error');
  }

  // Clear state cookie after validation (one-time use)
  cookies.delete('state', { path: '/' });

  if (!code) {
    console.error('Authorization code missing');
    return redirect('/auth/error');
  }

  try {
    // Exchange authorization code for access and refresh tokens
    const tokens = await exchangeAuthorizationCode(code);

    // Encrypt tokens for secure storage
    const encryptedSession = await seal(tokens);

    // Store encrypted session in HTTP-only cookie
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
