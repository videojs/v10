import Mux from '@mux/mux-node';
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';

function getMuxClient(token: string | undefined) {
  if (!token) {
    throw new Error('Authorization token is missing');
  }

  return new Mux({ authorizationToken: token, baseURL: import.meta.env.MUX_API_URL });
}

export const mux = {
  // List all video assets with pagination
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

  // Get a single asset by ID
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
