import type { MuxSource } from '@videojs/media/dom/mux';
import { getMuxAssetId } from './mux';

export interface SandboxSource {
  label: string;
  /** Plain media URL. Absent when the source needs more than a URL can carry. */
  url?: string;
  type: 'hls' | 'mp4' | 'dash' | 'none';
  subType?: 'ts' | 'mp4';
  live?: boolean;
  /** DRM protected, so only a preset that can license it should offer it. */
  drm?: boolean;
  /** Structured source, for what a plain `url` cannot express. Takes precedence. */
  source?: MuxSource;
}

const SOURCE_MAP = {
  'hls-1': {
    label: 'HLS - Big Buck Bunny',
    url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
    type: 'hls',
    subType: 'ts',
  },
  'hls-2': {
    label: 'HLS - Elephants Dream',
    url: 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008.m3u8',
    type: 'hls',
    subType: 'ts',
  },
  'hls-3': {
    label: 'HLS - Dancing Dude',
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-4': {
    label: 'HLS - View From A Blue Moon Trailer',
    url: 'https://stream.mux.com/lyrKpPcGfqyzeI00jZAfW6MvP6GNPrkML.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-5': {
    label: 'HLS - Mad Max Fury Road Trailer',
    url: 'https://stream.mux.com/JX01bG8eB4uaoV3OpDuK602rBfvdSgrMObjwuUOBn4JrQ.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-6': {
    label: 'HLS - Tailwind (portrait)',
    url: 'https://stream.mux.com/vth873zxidmhBVVRWBKcPTxnSQ302QqUm.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-multi-audio': {
    label: 'HLS - Multi-language audio',
    url: 'https://stream.mux.com/s41JYeqIpBMBzE4OzxDyGR2yrp2hD1CQ6gJN9SlVGDQ.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-instant-clip': {
    // Clipped 60s→600s of the multi-audio asset, so A/V encode at native PTS ≈ 60s.
    // Exercises non-zero-PTS timestampOffset relocation: currentTime stays 0-based.
    label: 'HLS - Instant Clip (non-zero PTS)',
    url: 'https://stream.mux.com/s41JYeqIpBMBzE4OzxDyGR2yrp2hD1CQ6gJN9SlVGDQ.m3u8?asset_start_time=60&asset_end_time=600',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-drm': {
    // Structured rather than a URL: DRM playback is always signed, and every URL
    // this asset needs carries its own audience-scoped token. `drm` is the one
    // `MuxVideo` turns into FairPlay / Widevine / PlayReady license servers.
    //
    // Read-only tokens for a throwaway demo asset, signed to expire in 2038 so
    // the sandbox keeps working. They grant nothing beyond playing this video.
    label: 'HLS - DRM protected',
    type: 'hls',
    subType: 'mp4',
    drm: true,
    source: {
      playbackId: 'FefhWnSMzDqz5z9yxssihdRx8dV6srhYJ8301uQBhRak',
      playback: {
        token:
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6InYiLCJleHAiOjIxNDc0ODM2NDd9.jXIpJZPB7diM5M6jMVRQ6dELY5YnONzC8jJClm7CT1nm-q25F5PiCvHcdLGqerjN1V_7T9cjhSX02p1i0UiABaKX2Wa4HCf6H6ZSKbY3MiCiRJHnfZzr_cVHCuBRXJlMzXesK_VzgP4kVrVi9-Sj8fGaeQmt4mB0sgtGGM7LpGV1IJdv_9aWnqQpQK7IeWi9ivNwa9Vw-PeppfOFdyQbqYJScIAY-_k6fzGaQucONyIolFGJZuBcan3nDRvCUpSFi0vPO87jf5Zbp6kn-HeARmUTYDPBLoeVSjttxYhoeDQYtNeqbuJ3Tj6S1_9TsE_SNSNZm3lxHoJCz5Wp_YcusQ',
      },
      drm: {
        token:
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6ImQiLCJleHAiOjIxNDc0ODM2NDd9.y7WKwBu0n87GaluPBJEMul4mxh-UlOFG_zClbEj3aZ23fXYmSfrpw-H2P3iFKtYt0DKiL-ta-J7EWiA74s77DTH2R70F86tvEFD0NQZ197qqClWtigOKkrpL1_o5RMXqjRf0lLAfwL6IFqm_Vhzf7mQTG99FRXKIU8S1q-zAEglWCYy1uZxQPivnSZxtK4IZZWmhHG6ot-VP_QkACc9cH8DIOpdYavjdXsPAxs3Ejx9ZUBQSqkjE7zyd11HhQvNzm9V_YxHJz5QgayOeWLEmwaKycFycHrR-INdVQwFAoK3EHF-tZngQpINuYoUHN5dPwzC8VJoFneLmdNAVuzbLkw',
      },
      poster: {
        token:
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6InQiLCJleHAiOjIxNDc0ODM2NDd9.gzoiMPjqjRSS8F1PjrvaOX4a0J9m-L1Egx3DIQVWbTWr89T21cSMJI5mPKs89umv0f7tvZjHjIaUY6L1wmdGR3FwVBLj5nvWx1DPWayJvqZbIv-2DoSCbTdui5tsPvgxtAAfmX_GGvb1UB4apGY6njapHmzMT__oTHTKvAM8e4waJGswtv9cr6V3TE8ysSqdS3_Cbme5e69S3IULjLHl21JSrHK-ABY7IzNxLOoT8lbyh77P3NMw-jF2joRVQK6hZJnAMY99_k8K2hRmGEQRMw-NTtOeM1gWQar6-Ksb7ZOZidshCHHqI69iF_ricl-Csb_c4O3ai3BZLviM7ZXRVg',
      },
      storyboard: {
        token:
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6InMiLCJleHAiOjIxNDc0ODM2NDd9.Eh5a51KEYRbwWIvX7M3Z-9hMwmydt2XC9kq0m-oCmnSegnN0l-GOQoUvzFMOOCKJHbfVRTuLkEvoCjCgo1JEmTHKRDo7u_V5JDZbQf6xKjtJXlTEibNEi_wD3M_3DiuYYv3R5sNol97j-yGbJQ8_16HTv7muJhr7qI8S9sKr_zJgp_E0PyFBm6plaigWcDBMcXfcvK4I9IwTKBehlXw2sVy6eUarhmS_wtA6sNXJk8f2RG2fUnt6jq8HWQlpkrXTqJCDcQ69dwDzl_TOdDWWLN3dNBlmGyEjEZyHJD2podRdddV4Yu78_bq7ImCH05JpJqY_caX9seXS6uJh38HuIA',
      },
    },
  },
  'hls-live': {
    label: 'HLS - Live Stream Big Buck Bunny',
    url: 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8',
    type: 'hls',
    subType: 'mp4',
    live: true,
  },
  'hls-audio-only-cmaf': {
    label: 'HLS - Audio only (CMAF/fmp4)',
    url: 'https://stream.mux.com/2NEjLyf6ETnskbfAtbM00Vdzb97B00OKUUQcRD6LZpBRw.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'mp4-1': {
    label: 'MP4 - Dancing Dude',
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
    type: 'mp4',
  },
  'dash-1': {
    label: 'DASH - Big Buck Bunny',
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    type: 'dash',
  },
  'dash-2': {
    label: 'DASH - Envivio Test Stream',
    url: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd',
    type: 'dash',
  },
  // Empty src — exercises source teardown with nothing re-attaching, and the
  // engine's fresh-but-attached "no source" state. `src` forwards to the host
  // property rather than being mirrored onto the inner native element, so this
  // reaches the adapter as `''` (un-resolving the presentation) instead of
  // making the element load the document URL.
  none: {
    label: 'None (empty src)',
    url: '',
    type: 'none',
  },
} satisfies Record<string, SandboxSource>;

export type SourceId = keyof typeof SOURCE_MAP;

// Annotated rather than `as const`: indexing by a `SourceId` yields one entry
// shape, so callers see `url` and `source` as the optional fields they are
// instead of a union of literal types that only some members share.
export const SOURCES: Record<SourceId, SandboxSource> = SOURCE_MAP;

export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
export const NON_DASH_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type !== 'dash' && !isDrmSource(id));
/** Mux presets add the DRM asset: they are the only ones that can derive its license URLs. */
export const MUX_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type !== 'dash');
export const MP4_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'mp4');
export const DASH_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'dash');
export const DEFAULT_SOURCE: SourceId = 'hls-1';
export const DEFAULT_AUDIO_SOURCE: SourceId = 'mp4-1';
export const DEFAULT_DASH_SOURCE: SourceId = 'dash-1';

export const BACKGROUND_VIDEO_SRC = 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/low.mp4';

export const VIMEO_VIDEO_SRC = 'https://vimeo.com/648359100';

/** Returns true when the given source represents a live stream and should use the live-video skin. */
export function isLiveSource(id: SourceId): boolean {
  return SOURCES[id].live === true;
}

/** Returns true when the given source is DRM protected and needs signed tokens. */
export function isDrmSource(id: SourceId): boolean {
  return SOURCES[id].drm === true;
}

// A signed asset rejects an unsigned image URL, so a source that carries an
// image token signs with it, alongside whatever params the caller asked for.
function imageQuery(id: SourceId, kind: 'poster' | 'storyboard', params?: string): string {
  const query = new URLSearchParams(params);

  const token = SOURCES[id].source?.[kind]?.token;
  if (token) query.set('token', token);

  const search = query.toString();
  return search ? `?${search}` : '';
}

export function getPosterSrc(source: SourceId): string | undefined {
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/thumbnail.jpg${imageQuery(source, 'poster')}` : undefined;
}

export function getPlaceholderSrc(source: SourceId): string | undefined {
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/thumbnail.jpg${imageQuery(source, 'poster', 'width=20')}` : undefined;
}

export function getStoryboardSrc(source: SourceId): string | undefined {
  // Storyboards aren't generated for live streams, so skip the request entirely.
  if (isLiveSource(source)) return undefined;
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/storyboard.vtt${imageQuery(source, 'storyboard')}` : undefined;
}
