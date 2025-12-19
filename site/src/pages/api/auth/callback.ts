import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Verify state to prevent CSRF
  const storedState = cookies.get('oauth_state')?.value;
  if (!state || state !== storedState) {
    return new Response('Invalid state parameter', { status: 400 });
  }

  // Clear state cookie
  cookies.delete('oauth_state', { path: '/' });

  if (!code) {
    return new Response('Authorization code missing', { status: 400 });
  }

  const clientId = import.meta.env.OAUTH_CLIENT_ID;
  const clientSecret = import.meta.env.OAUTH_CLIENT_SECRET;
  const redirectUri = import.meta.env.OAUTH_REDIRECT_URI;
  const authUrl = import.meta.env.OAUTH_AUTH_URL;

  if (!clientId || !clientSecret || !redirectUri || !authUrl) {
    return new Response('OAuth configuration missing', { status: 500 });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${authUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return new Response('Failed to exchange authorization code', { status: 500 });
    }

    const tokens = await tokenResponse.json();

    // Store access token in secure HTTP-only cookie
    cookies.set('session', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Optionally store refresh token if provided
    if (tokens.refresh_token) {
      cookies.set('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    // Redirect to home or dashboard
    return redirect('/', 302);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
};
