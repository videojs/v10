import { ActionError, defineAction } from 'astro:actions';
import { MUX_API_URL, MUX_TOKEN_ID, MUX_TOKEN_SECRET } from 'astro:env/server';
import { z } from 'astro:schema';
import Mux from '@mux/mux-node';

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

  return new Mux({
    authorizationToken: token,
    baseURL: MUX_API_URL,
  });
}

function getHealthMuxClient() {
  const tokenId = MUX_TOKEN_ID;
  const tokenSecret = MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new ActionError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set',
    });
  }

  return new Mux({
    tokenId,
    tokenSecret,
  });
}

export const mux = {
  /** Unauthenticated health check that verifies the Mux API proxy layer. */
  health: defineAction({
    handler: async () => {
      try {
        const muxClient = getHealthMuxClient();
        await muxClient.video.assets.list({ limit: 0 });
        return { ok: true };
      } catch (error) {
        if (error instanceof ActionError) throw error;

        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Mux health check failed',
        });
      }
    },
  }),
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

  /**
   * Create a direct upload URL for client-side uploads.
   * Returns the signed upload URL and upload ID for tracking.
   */
  createDirectUpload: defineAction({
    input: z.object({
      corsOrigin: z.string().optional(),
    }),
    handler: async (input, ctx) => {
      const muxClient = getMuxClient(ctx.locals.accessToken);

      try {
        const upload = await muxClient.video.uploads.create({
          cors_origin: input.corsOrigin || '*',
          new_asset_settings: {
            playback_policy: ['public'],
            video_quality: 'basic',
          },
        });

        return {
          uploadUrl: upload.url,
          uploadId: upload.id,
        };
      } catch (error) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create upload',
        });
      }
    },
  }),

  /**
   * Poll upload status to get asset_id once processing begins.
   * Status: 'waiting' | 'asset_created' | 'errored' | 'cancelled' | 'timed_out'
   */
  getUploadStatus: defineAction({
    input: z.object({
      uploadId: z.string(),
    }),
    handler: async (input, ctx) => {
      const muxClient = getMuxClient(ctx.locals.accessToken);

      try {
        const upload = await muxClient.video.uploads.retrieve(input.uploadId);

        return {
          status: upload.status,
          assetId: upload.asset_id,
        };
      } catch (error) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get upload status',
        });
      }
    },
  }),

  /**
   * Poll asset status to get playback_id once ready.
   * Status: 'preparing' | 'ready' | 'errored'
   */
  getAssetStatus: defineAction({
    input: z.object({
      assetId: z.string(),
    }),
    handler: async (input, ctx) => {
      const muxClient = getMuxClient(ctx.locals.accessToken);

      try {
        const asset = await muxClient.video.assets.retrieve(input.assetId);

        return {
          status: asset.status,
          playbackId: asset.playback_ids?.[0]?.id,
        };
      } catch (error) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get asset status',
        });
      }
    },
  }),
};
