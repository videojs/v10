import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ redirect }) => {
  const clientId = import.meta.env.OAUTH_CLIENT_ID;
  const redirectUri = import.meta.env.OAUTH_REDIRECT_URI;
  const authUrl = import.meta.env.OAUTH_AUTH_URL;

  if (!clientId || !redirectUri || !authUrl) {
    return new Response('OAuth configuration missing', { status: 500 });
  }

  // Generate random state for CSRF protection
  const state = crypto.randomUUID();

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    // Add any required scopes here
    // scope: 'read write',
  });

  const authorizationUrl = `${authUrl}/oauth2/authorize?${params.toString()}`;

  // Store state in a cookie to verify in callback
  // Return the URL so frontend can open it in a popup
  return new Response(JSON.stringify({ authorizationUrl }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
};
