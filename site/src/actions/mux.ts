import Mux from '@mux/mux-node';
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';

/**
 * Creates an authenticated Mux API client
 *
 * Uses the access token from the user's session (provided by middleware)
 * to authenticate requests to the Mux API.
 *
 * @param token - OAuth access token from user session
 * @throws {Error} If token is missing or invalid
 */
function getMuxClient(token: string | undefined) {
  if (!token) {
    throw new ActionError({ code: 'UNAUTHORIZED' });
  }

  return new Mux({ authorizationToken: token, baseURL: import.meta.env.MUX_API_URL ?? 'https://api.mux.com' });
}

export const mux = {
  /**
   * List video assets with pagination
   *
   * Fetches a paginated list of video assets from Mux.
   * Requires an authenticated session with valid access token.
   *
   * @param limit - Number of assets per page (default: 25)
   * @param page - Page number to fetch (default: 1)
   * @returns Array of video asset objects
   */
  listAssets: defineAction({
    input: z.object({
      limit: z.number().optional().default(25),
      page: z.number().optional().default(1),
    }),
    handler: async (input, ctx) => {
      const muxClient = getMuxClient(ctx.locals.accessToken);

      try {
        const assets = await muxClient.video.assets.list({
          limit: input.limit,
          page: input.page,
        });

        return assets.data;
      } catch (error) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch assets',
        });
      }
    },
  }),

  /**
   * Retrieve a single video asset by ID
   *
   * Fetches detailed information about a specific video asset.
   * Requires an authenticated session with valid access token.
   *
   * @param id - The unique Mux asset ID
   * @returns Video asset object with full details
   */
  getAsset: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, ctx) => {
      const muxClient = getMuxClient(ctx.locals.accessToken);

      try {
        const asset = await muxClient.video.assets.retrieve(input.id);

        return asset;
      } catch (error) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch asset',
        });
      }
    },
  }),
};
