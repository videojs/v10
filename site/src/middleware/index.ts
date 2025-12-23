import type { JWTPayload } from 'jose';
import type { OAuthResponse } from '@/utils/auth';
import { defineMiddleware } from 'astro:middleware';
import { jwtVerify } from 'jose';
import { INACTIVITY_EXPIRY, JWKS, refreshToken, seal, SESSION_COOKIE_NAME, unseal } from '@/utils/auth';

/** JWT payload structure from the OAuth ID token */
interface UserJWT extends JWTPayload {
  name: string;
  email: string;
  email_verified: boolean;
}

/**
 * Middleware to validate and refresh user sessions on every request
 *
 * Flow:
 * 1. Checks for session cookie and decrypts it
 * 2. Verifies access token validity using JWKS
 * 3. If expired, refreshes the token automatically
 * 4. Validates ID token and extracts user information
 * 5. Populates context.locals with user data and access token
 *
 * Security notes:
 * - Access tokens are verified against the OAuth server's JWKS
 * - Expired or invalid sessions are automatically cleared
 * - Access tokens SHOULD only be available server-side (context.locals)
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const cookie = context.cookies.get(SESSION_COOKIE_NAME);
  let verifiedSession: OAuthResponse | null = null;

  // No session cookie - proceed as unauthenticated user
  if (!cookie) {
    return next();
  }

  try {
    // Decrypt the session from the encrypted cookie
    const currentSession = await unseal<OAuthResponse>(cookie.value);

    try {
      // Verify the access token is still valid using JWKS
      await jwtVerify(currentSession.access_token, JWKS);
      verifiedSession = currentSession;
    } catch {
      // Access token expired - refresh it using the refresh token
      const newSession = await refreshToken(currentSession.refresh_token);

      // Verify the new access token is valid
      await jwtVerify(newSession.access_token, JWKS);

      // Encrypt and store the new session
      const encryptedSession = await seal<OAuthResponse>(newSession);

      context.cookies.set(SESSION_COOKIE_NAME, encryptedSession, {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: INACTIVITY_EXPIRY,
        path: '/',
      });

      verifiedSession = newSession;
    }

    // Verify ID token signature and extract user information
    const { payload: user } = await jwtVerify<UserJWT>(
      verifiedSession.id_token,
      JWKS,
    );

    // Populate Astro context with user information (safe for rendering)
    context.locals.user = {
      email: user.email,
      name: user.name,
    };

    // Populate Astro context with access token (server-side only)
    // WARNING: NEVER expose this token to client-side code
    // Only use for authenticated server-to-server API calls
    context.locals.accessToken = verifiedSession.access_token;
  } catch (error) {
    console.error('Session error:', error);
    // Clear corrupted or invalid session
    context.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  }

  return next();
});
