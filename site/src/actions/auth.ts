import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { SESSION_COOKIE_NAME } from '@/utils/auth';

const { OAUTH_CLIENT_ID, OAUTH_REDIRECT_URI, OAUTH_URL, PROD } = import.meta.env;

export const auth = {
  /**
   * Initiates the OAuth 2.0 login flow
   *
   * Generates a CSRF-protected state parameter and returns the authorization URL
   * for the client to redirect to. The state is stored in a short-lived cookie
   * and verified in the callback endpoint.
   *
   * @returns {authorizationUrl} - The OAuth authorization URL to redirect to
   */
  initiateLogin: defineAction({
    handler: async (_input, ctx) => {
      // Validate required OAuth configuration
      if (!OAUTH_CLIENT_ID || !OAUTH_REDIRECT_URI || !OAUTH_URL) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OAuth configuration missing',
        });
      }

      // Generate cryptographically secure random state for CSRF protection
      const state = crypto.randomUUID();

      // Build OAuth 2.0 authorization URL with required parameters
      const params = new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid profile email offline_access',
        state,
      });

      // Store state in a short-lived cookie for verification in the callback
      ctx.cookies.set('state', state, {
        httpOnly: true,
        secure: PROD,
        sameSite: 'lax',
        maxAge: 600, // Expires after 10 minutes
        path: '/',
      });

      return { authorizationUrl: `${OAUTH_URL}/oauth2/authorize?${params.toString()}` };
    },
  }),

  /**
   * Logs out the current user by clearing the session cookie
   *
   * Accepts form submissions to prevent CSRF attacks on logout endpoints.
   *
   * @returns {success: true} - Indicates successful logout
   */
  logout: defineAction({
    accept: 'form',
    input: z.object({}),
    handler: async (_input, ctx) => {
      // Clear the encrypted session cookie
      ctx.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

      return { success: true };
    },
  }),
};
