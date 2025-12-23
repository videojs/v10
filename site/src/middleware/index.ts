import type { JWTPayload } from 'jose';
import type { OAuthResponse } from '@/utils/auth';
import { defineMiddleware } from 'astro:middleware';
import { jwtVerify } from 'jose';
import { INACTIVITY_EXPIRY, JWKS, refreshToken, seal, SESSION_COOKIE_NAME, unseal } from '@/utils/auth';

interface UserJWT extends JWTPayload {
  name: string;
  email: string;
  email_verified: boolean;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const cookie = context.cookies.get(SESSION_COOKIE_NAME);
  let verifiedSession: OAuthResponse | null = null;

  if (!cookie) {
    return next();
  }

  try {
    const currentSession = await unseal<OAuthResponse>(cookie.value);

    try {
      // Verify the access token with JWKS
      await jwtVerify(currentSession.access_token, JWKS);
      verifiedSession = currentSession;
    } catch {
      const newSession = await refreshToken(currentSession.refresh_token);

      // Verify the new access token
      await jwtVerify(newSession.access_token, JWKS);

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

    // Ensure the id_token wasn't tampered with...
    const { payload: user } = await jwtVerify<UserJWT>(
      verifiedSession.id_token,
      JWKS,
    );

    // Set Astro context for user information
    context.locals.user = {
      email: user.email,
      name: user.name,
    };
    // Set Astro context for access token information
    // WARNING: DO NOT RENDER CLIENT-SIDE. ONLY USE FOR SERVER-SIDE COMMUNICATION
    context.locals.accessToken = verifiedSession.access_token;
  } catch (error) {
    console.error('Session error:', error);
    // Clear corrupted session
    context.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  }

  return next();
});
