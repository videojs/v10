import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { SESSION_COOKIE_NAME } from '@/utils/auth';

const { OAUTH_CLIENT_ID, OAUTH_REDIRECT_URI, OAUTH_URL, PROD } = import.meta.env;

export const auth = {
  initiateLogin: defineAction({
    handler: async (_input, ctx) => {
      if (!OAUTH_CLIENT_ID || !OAUTH_REDIRECT_URI || !OAUTH_URL) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OAuth configuration missing',
        });
      }

      // Generate random state for CSRF protection
      const state = crypto.randomUUID();

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid profile email offline_access',
        state,
      });

      // Store state in a cookie for verification in the callback
      ctx.cookies.set('state', state, {
        httpOnly: true,
        secure: PROD,
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });

      return { authorizationUrl: `${OAUTH_URL}/oauth2/authorize?${params.toString()}` };
    },
  }),

  logout: defineAction({
    accept: 'form',
    input: z.object({}),
    handler: async (_input, ctx) => {
      ctx.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

      return { success: true };
    },
  }),
};
