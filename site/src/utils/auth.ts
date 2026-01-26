import { sealData, unsealData } from 'iron-session';
import { createRemoteJWKSet } from 'jose';

const { OAUTH_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI, SESSION_COOKIE_PASSWORD } = import.meta
  .env;

// =============================================================================
// Types
// =============================================================================

export interface OAuthResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: 'bearer';
  expires_in: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Session expires after 2 days of inactivity */
export const INACTIVITY_EXPIRY = 60 * 60 * 24 * 2;

/** Cookie name for encrypted session storage */
export const SESSION_COOKIE_NAME = 'session';

// =============================================================================
// OAuth Token Management
// =============================================================================

/**
 * Refresh an expired access token using a refresh token
 * @throws {Error} If token refresh fails
 */
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
    throw new Error('Failed to refresh authorization token');
  }

  return response.json();
}

/**
 * Exchange an authorization code for access tokens
 * @throws {Error} If token exchange fails
 */
export async function exchangeAuthorizationCode(code: string): Promise<OAuthResponse> {
  const response = await fetch(`${OAUTH_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

/**
 *  JSON Web Key Set for verifying JWT tokens - lazily initialized
 */
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
export function getJWKS() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(`${OAUTH_URL}/oauth2/jwks`));
  }
  return _jwks;
}

// =============================================================================
// Session Encryption
// =============================================================================

/**
 * Decrypt and unseal session data from an encrypted cookie value
 */
export async function unseal<T>(cookieValue: string): Promise<T> {
  return unsealData<T>(cookieValue, {
    password: SESSION_COOKIE_PASSWORD,
  });
}

/**
 * Encrypt and seal session data for secure cookie storage
 */
export async function seal<T>(data: T): Promise<string> {
  return sealData(data, {
    password: SESSION_COOKIE_PASSWORD,
    ttl: INACTIVITY_EXPIRY,
  });
}
