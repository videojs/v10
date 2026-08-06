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
  /**
   * Ready-made poster image URL, for a source with no Mux playback ID to derive
   * one from. Takes precedence over the derived URL.
   */
  poster?: string;
  /** Structured source, for what a plain `url` cannot express. Takes precedence. */
  source?: MuxSource;
}

// The two DRM sources below are the same Mux asset reached two ways, so the
// tokens are shared rather than repeated. DRM playback is always signed, and
// each URL carries its own audience-scoped token: `playback` for the manifest,
// `drm` for the license request, `thumbnail` / `storyboard` for the images.
//
// Read-only tokens for a throwaway demo asset, signed to expire in 2038 so the
// sandbox keeps working. They grant nothing beyond playing this one video.
const DRM_PLAYBACK_ID = 'FefhWnSMzDqz5z9yxssihdRx8dV6srhYJ8301uQBhRak';

const DRM_TOKENS = {
  playback:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6InYiLCJleHAiOjIxNDc0ODM2NDd9.jXIpJZPB7diM5M6jMVRQ6dELY5YnONzC8jJClm7CT1nm-q25F5PiCvHcdLGqerjN1V_7T9cjhSX02p1i0UiABaKX2Wa4HCf6H6ZSKbY3MiCiRJHnfZzr_cVHCuBRXJlMzXesK_VzgP4kVrVi9-Sj8fGaeQmt4mB0sgtGGM7LpGV1IJdv_9aWnqQpQK7IeWi9ivNwa9Vw-PeppfOFdyQbqYJScIAY-_k6fzGaQucONyIolFGJZuBcan3nDRvCUpSFi0vPO87jf5Zbp6kn-HeARmUTYDPBLoeVSjttxYhoeDQYtNeqbuJ3Tj6S1_9TsE_SNSNZm3lxHoJCz5Wp_YcusQ',
  drm: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6ImQiLCJleHAiOjIxNDc0ODM2NDd9.y7WKwBu0n87GaluPBJEMul4mxh-UlOFG_zClbEj3aZ23fXYmSfrpw-H2P3iFKtYt0DKiL-ta-J7EWiA74s77DTH2R70F86tvEFD0NQZ197qqClWtigOKkrpL1_o5RMXqjRf0lLAfwL6IFqm_Vhzf7mQTG99FRXKIU8S1q-zAEglWCYy1uZxQPivnSZxtK4IZZWmhHG6ot-VP_QkACc9cH8DIOpdYavjdXsPAxs3Ejx9ZUBQSqkjE7zyd11HhQvNzm9V_YxHJz5QgayOeWLEmwaKycFycHrR-INdVQwFAoK3EHF-tZngQpINuYoUHN5dPwzC8VJoFneLmdNAVuzbLkw',
  thumbnail:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6InQiLCJleHAiOjIxNDc0ODM2NDd9.gzoiMPjqjRSS8F1PjrvaOX4a0J9m-L1Egx3DIQVWbTWr89T21cSMJI5mPKs89umv0f7tvZjHjIaUY6L1wmdGR3FwVBLj5nvWx1DPWayJvqZbIv-2DoSCbTdui5tsPvgxtAAfmX_GGvb1UB4apGY6njapHmzMT__oTHTKvAM8e4waJGswtv9cr6V3TE8ysSqdS3_Cbme5e69S3IULjLHl21JSrHK-ABY7IzNxLOoT8lbyh77P3NMw-jF2joRVQK6hZJnAMY99_k8K2hRmGEQRMw-NTtOeM1gWQar6-Ksb7ZOZidshCHHqI69iF_ricl-Csb_c4O3ai3BZLviM7ZXRVg',
  storyboard:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJGZWZoV25TTXpEcXo1ejl5eHNzaWhkUng4ZFY2c3JoWUo4MzAxdVFCaFJhayIsImF1ZCI6InMiLCJleHAiOjIxNDc0ODM2NDd9.Eh5a51KEYRbwWIvX7M3Z-9hMwmydt2XC9kq0m-oCmnSegnN0l-GOQoUvzFMOOCKJHbfVRTuLkEvoCjCgo1JEmTHKRDo7u_V5JDZbQf6xKjtJXlTEibNEi_wD3M_3DiuYYv3R5sNol97j-yGbJQ8_16HTv7muJhr7qI8S9sKr_zJgp_E0PyFBm6plaigWcDBMcXfcvK4I9IwTKBehlXw2sVy6eUarhmS_wtA6sNXJk8f2RG2fUnt6jq8HWQlpkrXTqJCDcQ69dwDzl_TOdDWWLN3dNBlmGyEjEZyHJD2podRdddV4Yu78_bq7ImCH05JpJqY_caX9seXS6uJh38HuIA',
} as const;

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
  'mux-drm': {
    // Mux-flavoured DRM: `drm.token` is all `MuxVideo` needs, because it derives
    // every license server URL from the playback ID. Only the Mux presets can
    // play it — nothing else knows how to read a Mux DRM token.
    label: 'HLS - DRM protected (Mux token)',
    type: 'hls',
    subType: 'mp4',
    drm: true,
    source: {
      playbackId: DRM_PLAYBACK_ID,
      playback: { token: DRM_TOKENS.playback },
      drm: { token: DRM_TOKENS.drm },
      poster: { token: DRM_TOKENS.thumbnail },
      storyboard: { token: DRM_TOKENS.storyboard },
    },
  },
  'hls-drm': {
    // The same asset, licensed the generic way: hls.js's own `drmSystems`, keyed
    // by EME key system id and naming each license server outright. Works on any
    // hls.js-backed element, and shows what `source.engine` still reaches.
    label: 'HLS - DRM protected (engine config)',
    type: 'hls',
    subType: 'mp4',
    drm: true,
    poster: `https://image.mux.com/${DRM_PLAYBACK_ID}/thumbnail.webp?token=${DRM_TOKENS.thumbnail}`,
    source: {
      src: `https://stream.mux.com/${DRM_PLAYBACK_ID}.m3u8?token=${DRM_TOKENS.playback}`,
      engine: {
        // hls.js only listens for `encrypted` when EME is switched on.
        emeEnabled: true,
        drmSystems: {
          'com.apple.fps': {
            licenseUrl: `https://license.mux.com/license/fairplay/${DRM_PLAYBACK_ID}?token=${DRM_TOKENS.drm}`,
            serverCertificateUrl: `https://license.mux.com/appcert/fairplay/${DRM_PLAYBACK_ID}?token=${DRM_TOKENS.drm}`,
          },
          'com.widevine.alpha': {
            licenseUrl: `https://license.mux.com/license/widevine/${DRM_PLAYBACK_ID}?token=${DRM_TOKENS.drm}`,
          },
          'com.microsoft.playready': {
            licenseUrl: `https://license.mux.com/license/playready/${DRM_PLAYBACK_ID}?token=${DRM_TOKENS.drm}`,
          },
        },
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
  // One variant, CODECS="mp4a.40.2", `.ts` segments and no EXT-X-MAP. The audio
  // counterpart of the MPEG-TS case, and the only source here that reaches the
  // *audio* verdict (2012): the other TS assets mux audio into their video
  // variants, so they expose no audio rendition to prune.
  'hls-audio-only-ts': {
    label: 'HLS - Audio only (MPEG-TS)',
    url: 'https://stream.mux.com/3zd01ukbq5UaSPrfGnZ2eYBcMXuf3Uc5Rc5XINRcHA00g.m3u8',
    type: 'hls',
    subType: 'ts',
  },
  // The same asset again, reached by plain URL and deliberately left unlicensed,
  // so any preset can be pointed at it. Video renditions carry #EXT-X-KEY for all
  // three key systems; the audio rendition is clear. An engine with no EME/license
  // pipeline prunes the video renditions and reports the source as protected,
  // which is the point: it is here to be refused, not played.
  'hls-drm-unlicensed': {
    label: 'HLS - DRM protected (no license)',
    url: `https://stream.mux.com/${DRM_PLAYBACK_ID}.m3u8?token=${DRM_TOKENS.playback}`,
    type: 'hls',
    subType: 'mp4',
    drm: true,
    poster: `https://image.mux.com/${DRM_PLAYBACK_ID}/thumbnail.webp?token=${DRM_TOKENS.thumbnail}`,
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
/** hls.js-backed presets add the DRM asset that names its license servers outright. */
export const HLSJS_SOURCE_IDS = SOURCE_IDS.filter(
  (id) => SOURCES[id].type !== 'dash' && id !== 'mux-drm' && id !== 'hls-drm-unlicensed'
);
/** Mux presets add the DRM asset licensed by a Mux token, which only they can read. */
export const MUX_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type !== 'dash' && id !== 'hls-drm-unlicensed');
/**
 * Simple HLS is the SPF engine, which has no EME and so can license neither DRM
 * asset. It still gets the unlicensed one: refusing a protected source visibly is
 * the behavior worth reaching here, unlike the licensable assets that would only
 * fail obscurely.
 */
export const SIMPLE_HLS_SOURCE_IDS = SOURCE_IDS.filter(
  (id) => SOURCES[id].type !== 'dash' && (!isDrmSource(id) || id === 'hls-drm-unlicensed')
);
export const MP4_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'mp4');
export const DASH_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'dash');
export const DEFAULT_SOURCE: SourceId = 'hls-1';
export const DEFAULT_AUDIO_SOURCE: SourceId = 'mp4-1';
export const DEFAULT_DASH_SOURCE: SourceId = 'dash-1';

export const BACKGROUND_VIDEO_SRC = 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/low.mp4';

export const VIMEO_VIDEO_SRC = 'https://vimeo.com/648359100';

export const YOUTUBE_VIDEO_SRC = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';

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
  const { poster } = SOURCES[source];
  if (poster) return poster;

  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/thumbnail.webp${imageQuery(source, 'poster')}` : undefined;
}

export function getPlaceholderSrc(source: SourceId): string | undefined {
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/thumbnail.webp${imageQuery(source, 'poster', 'width=20')}` : undefined;
}

export function getStoryboardSrc(source: SourceId): string | undefined {
  // Storyboards aren't generated for live streams, so skip the request entirely.
  if (isLiveSource(source)) return undefined;
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/storyboard.vtt${imageQuery(source, 'storyboard')}` : undefined;
}
