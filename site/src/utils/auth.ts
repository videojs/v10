import { sealData, unsealData } from 'iron-session';
import { createRemoteJWKSet } from 'jose';

const { OAUTH_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI, SESSION_COOKIE_PASSWORD } = import.meta.env;

export interface OAuthResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: 'bearer';
  expires_in: number;
}

// Expires 2 days after inactivity
export const INACTIVITY_EXPIRY = 60 * 60 * 24 * 2;
export const JWKS = createRemoteJWKSet(new URL(`${OAUTH_URL}/oauth2/jwks`));
export const SESSION_COOKIE_NAME = 'session';

export async function refreshToken(refreshToken: string): Promise<OAuthResponse> {
  const response = await fetch(`${OAUTH_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      scope: 'openid profile email offline_access',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh authorization code');
  }

  return response.json();
}

export async function authorizationCode(code: string): Promise<OAuthResponse> {
  const response = await fetch(`${OAUTH_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      redirect_uri: OAUTH_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token exchange failed:', error);
    throw new Error('Failed to exchange authorization code');
  }

  return response.json();
}

export async function unseal<T>(cookieValue: string) {
  return unsealData<T>(cookieValue, {
    password: SESSION_COOKIE_PASSWORD,
  });
}

export async function seal<T>(data: T) {
  return sealData(data, {
    password: SESSION_COOKIE_PASSWORD,
    ttl: INACTIVITY_EXPIRY,
  });
}
