import type { MuxSource } from '@videojs/media/dom/mux';

import { getMuxAssetId } from './mux';

export interface ChapterTrack {
  label: string;
  lang: string;
  src: string;
  isDefault: boolean;
}

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
   * Ready-made poster image URL, for a source with no Mux playback ID to derive one from. Takes precedence over the
   * derived URL.
   */
  poster?: string;
  /** Structured source, for what a plain `url` cannot express. Takes precedence. */
  source?: MuxSource;
  chapters?: readonly ChapterTrack[];
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

// Signed playback, the non-DRM half of Mux's protected playback. These are the
// `hls-3` and `hls-audio-only-cmaf` assets again, each given a second playback
// ID whose policy is `signed`: the public IDs above still play unsigned, these
// two answer 403 without a token. Every URL derived from one carries its own
// audience-scoped token, exactly as the DRM asset does.
//
// Read-only tokens for demo assets, signed to expire in 2038 so the sandbox
// keeps working. They grant nothing beyond playing these two.
const SIGNED_PLAYBACK_ID = 'fRL8fOesiMjQPieNYbp5fE3gxbLfx33iyeyaTTFkH54';
const SIGNED_AUDIO_PLAYBACK_ID = 'k01NS53023biEozpmRz2fhIlzqPOLRWnguwaWp2YvGDfw';

const SIGNED_TOKENS = {
  playback:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJmUkw4Zk9lc2lNalFQaWVOWWJwNWZFM2d4YkxmeDMzaXlleWFUVEZrSDU0IiwiYXVkIjoidiIsImV4cCI6MjE0NzQ4MzY0N30.r89KDYdFlGidWKNFm_9SrZwVH5EK465GtlkXxs5_1rAIQU88OS9JQ2jHZTulW8ug5ThGTDg8kuWYT3XWFOoPLZGeLXxhH_-6qySdbn60FahgF20ITy4M-wGYA7jjwn-58xHAsL7giqtjepXlRuxRIQLWqiEafQ6DGNdTzULRo86nCP-cXHztfWRdynv84Of89ou8t5fO5wO7IcQnCHn97NLlLheCgI78u65W1FCsSjuDLBuiG1K1T1M4U02bn-e1GLLRBYjkOFQ6OUdc013L6m1Ou15xFbXZgX3JX7boXzmHouzj2Yj9HfzJqIwY534pQdHKoABXA6eAa7WzD3USPA',
  thumbnail:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJmUkw4Zk9lc2lNalFQaWVOWWJwNWZFM2d4YkxmeDMzaXlleWFUVEZrSDU0IiwiYXVkIjoidCIsImV4cCI6MjE0NzQ4MzY0N30.kXBmJjQZ9avJdRtLeO-D8FE-Fe6jlQKv356hZV_cVTv3o9TKL-YsFmh2x2wdq6EGqChXuR_geLlCDuPauI5poDYcfM48BhRDiipD6uj15B3F8rqHiYsPniTpvR5huVah0yPTqJQiTajROiRhcZVgsEyXewjPWkNLNOOCsKUToI9iEMKhLc1UAyZ5bw0sqFJMxe5QVEvKHp2fN5TFdDNlLycsuQW9UlaiNoHShYy8LmXzxQIQ5c0Z8SX8FYPHgW-6eHaOe1mafBliadgLN5JjJi7BPCROrVeqQiFj_F2aNeOhvWgqVz7husPCXZSwQZxPujIpS-XpLby1gphTXHpTtQ',
  storyboard:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJmUkw4Zk9lc2lNalFQaWVOWWJwNWZFM2d4YkxmeDMzaXlleWFUVEZrSDU0IiwiYXVkIjoicyIsImV4cCI6MjE0NzQ4MzY0N30.VxmkFpbIEqgFcEVDKJW7TysnnQtT47be0kjLKm6ZN5sUjOVyeeNGBp4TbCX63aZtkSoyvE-Lea9qUvartJ80Mh7WdaWaL7kA3WainnjpeI5EBvp_A1bHtXm7n2463wUeVUbv-0n9UuXVaRpUeyVBb-Yu7SfzP8FDtNIMVvoyvRmN4J4faHSQVFC_6F8uUldSkHNo_492oaA9CWsXmu1wZRIYtFuFOippTZkwbAieB0LtIq3E3Jixs7XTEVPmLjHZI-WJHqswToOUDYhB8iL7hCHkCFymNH7p15NFoWGxcumJ-XR3qg7KJJkSml42VO7plFwdlZ5MsEZeYJaSyLxM2Q',
} as const;

// Audio-only content has neither a thumbnail nor a storyboard to sign for.
const SIGNED_AUDIO_TOKENS = {
  playback:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IndGcXlSYlRjZDZSaEJkMDJ3Wnd6YTAwR0htNnFVOUlQZTFJS1kwMHgzMDE2dUhBIn0.eyJzdWIiOiJrMDFOUzUzMDIzYmlFb3pwbVJ6MmZoSWx6cVBPTFJXbmd1d2FXcDJZdkdEZnciLCJhdWQiOiJ2IiwiZXhwIjoyMTQ3NDgzNjQ3fQ.FAvBKpLUsRYRivnbmDuk40-_e9OmrwBHqPz73qWiJP-HDDjwO8I9JZjxgQv8MFLrtshaIYWOZFJMD4voldG4ZuTqiYbDRxblWysRPfAUF1nOv0yGxDM60xK1r_-DbdXdyZMmADEedxnkQr5-xrTrwpnbht_pFSqKdnBw10QvW6S68DznZgFX8kvDzHbBKmZX0PZqyhFoEwTgK4g5drGJQYB6vw_-9nUbBChPE27Wzcj9-6IAO7VH90RKw8BuSm1t0qBKIvwlzh6QaflWY8jeqHtUoYBcEDw-Wp1c--MxuoFiRUtpwz2TkAwIKs9SUbAN2BHZXwxh4Y3n1wc8Oo9MtA',
} as const;

/**
 * License servers for the DRM asset below, named outright rather than derived from a Mux token. `source.drm` is engine
 * neutral, so naming every system here licenses whichever path the browser takes — native HLS reads the FairPlay entry
 * and leaves the rest to hls.js.
 */
const DRM_SYSTEMS = {
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
  'hls-7': {
    label: 'HLS - Dahlback Golf RSI (chapters)',
    url: 'https://stream.mux.com/yH00b01Lj2z023hUQdEf6EpURPROSsvE1qWPnR8ShnbnI8.m3u8',
    type: 'hls',
    subType: 'mp4',
    chapters: [
      {
        label: 'English',
        lang: 'en',
        src: new URL('./chapters-en.vtt?no-inline', import.meta.url).href,
        isDefault: true,
      },
    ],
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
  /**
   * Apple's official HLS example stream (bipbop advanced, fMP4): HEVC and AVC renditions of the same content in one
   * multivariant playlist, which makes it the shared mixed-codec source — the initial pick decides a codec family and
   * SPF's ABR must hold it for the source's lifetime (no `SourceBuffer.changeType()`). Deliberately messy beyond the
   * codecs: not CMAF-compliant, ~44ms A/V origin skew, a 10s timestamp origin, and VTT subtitles relying on
   * `X-TIMESTAMP-MAP`.
   */
  'hls-mixed-codec': {
    label: 'HLS - Apple bipbop (HEVC + AVC)',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  // The `hls-3` and `hls-1` assets again, named by playback ID instead of URL.
  // Nothing about the content differs — they exist so the Mux presets exercise
  // the structured `source` on an ordinary public asset, where every other
  // source-shaped entry here is protected. Only a Mux preset can play them,
  // since nothing else turns a playback ID into a stream URL.
  'mux-source-cmaf': {
    label: 'HLS - Dancing Dude (Mux source)',
    type: 'hls',
    subType: 'mp4',
    source: { playbackId: 'lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4' },
  },
  'mux-source-ts': {
    label: 'HLS - Big Buck Bunny (Mux source)',
    type: 'hls',
    subType: 'ts',
    source: { playbackId: 'VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA' },
  },
  // Signed playback needs no engine support beyond the token: SPF plays these,
  // unlike the DRM entries below, because Mux serves ordinary CMAF once the URL
  // is authorized.
  'mux-signed': {
    label: 'HLS - Signed playback (Mux token)',
    type: 'hls',
    subType: 'mp4',
    source: {
      playbackId: SIGNED_PLAYBACK_ID,
      playback: { token: SIGNED_TOKENS.playback },
      poster: { token: SIGNED_TOKENS.thumbnail },
      storyboard: { token: SIGNED_TOKENS.storyboard },
    },
  },
  'mux-signed-audio': {
    label: 'HLS - Signed audio only (Mux token)',
    type: 'hls',
    subType: 'mp4',
    source: {
      playbackId: SIGNED_AUDIO_PLAYBACK_ID,
      playback: { token: SIGNED_AUDIO_TOKENS.playback },
    },
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
    // The same asset, licensed the generic way: `source.drm` naming the license
    // servers outright. Works on any HLS element, whichever path it takes.
    label: 'HLS - DRM protected (license servers)',
    type: 'hls',
    subType: 'mp4',
    drm: true,
    poster: `https://image.mux.com/${DRM_PLAYBACK_ID}/thumbnail.webp?token=${DRM_TOKENS.thumbnail}`,
    source: {
      src: `https://stream.mux.com/${DRM_PLAYBACK_ID}.m3u8?token=${DRM_TOKENS.playback}`,
      drm: DRM_SYSTEMS,
    },
  },
  'hls-live': {
    label: 'HLS - Live Stream Big Buck Bunny',
    url: 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8',
    type: 'hls',
    subType: 'mp4',
    live: true,
  },
  /**
   * A 4K ladder over HLS, and the default source for the SPF background presets.
   *
   * Deliberately _not_ the clip {@link BACKGROUND_VIDEO_SRC} plays: the rendition ladder has to straddle a real screen
   * for the screen-resolution cap to have anything to choose between. Its rungs run 640x360 → 3838x2160, so a display
   * under the top rung caps to 2558x1440 instead. (Those off-by-two widths are the source's near-square pixel aspect
   * ratio, not a typo, and they are the reason the cap compares pixel areas rather than matching `1920x1080`-style
   * tiers.) Video-only — the source carries no audio track.
   *
   * CMAF/fMP4, because SPF appends fMP4 segments directly and does no MPEG-TS transmuxing. Packaging follows the video
   * quality tier — `premium` yields CMAF, while `plus`/`basic` (legacy `encoding_tier: smart`) yield MPEG-TS — which is
   * also why a 4K ladder needs `max_resolution_tier: '2160p'` alongside `video_quality: 'premium'`.
   */
  'hls-4k': {
    label: 'HLS - Short 4K UHD 2160p',
    url: 'https://stream.mux.com/SfAaZ9InpM8FMfky7DkNBuTpxEDqU8Jchpa49urOWcs.m3u8',
    type: 'hls',
    subType: 'mp4',
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
export const NON_DASH_SOURCE_IDS = SOURCE_IDS.filter(
  (id) => SOURCES[id].type !== 'dash' && !isDrmSource(id) && !isMuxSource(id)
);
/**
 * HLS presets add the DRM asset that names its license servers outright. Both hls.js and native HLS read it, each from
 * its own half of the source — which half depends on the path the browser ends up taking.
 */
export const HLS_SOURCE_IDS = SOURCE_IDS.filter(
  (id) => SOURCES[id].type !== 'dash' && !isMuxSource(id) && id !== 'hls-drm-unlicensed'
);
/**
 * Mux presets add everything reached by playback ID, plus the DRM asset licensed by a Mux token, which only they can
 * read.
 */
export const MUX_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type !== 'dash' && id !== 'hls-drm-unlicensed');
/**
 * The SPF engine has no EME, so it can license neither DRM asset. It still gets the unlicensed one: refusing a
 * protected source visibly is the behavior worth reaching here, unlike the licensable assets that would only fail
 * obscurely. Signed playback is not DRM and stays — SPF plays it once the token authorizes the URL.
 */
export const MUX_SPF_SOURCE_IDS = SOURCE_IDS.filter(
  (id) => SOURCES[id].type !== 'dash' && (!isDrmSource(id) || id === 'hls-drm-unlicensed')
);
/** The plain HLS presets are the same engine without the Mux source, so they drop what only a playback ID reaches. */
export const SPF_HLS_SOURCE_IDS = MUX_SPF_SOURCE_IDS.filter((id) => !isMuxSource(id));
export const DASH_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'dash');
/**
 * Shaka plays DASH and HLS from one element, so it is the only preset offered both. The DRM assets are left out until
 * the sandbox hands it license servers.
 */
export const SHAKA_SOURCE_IDS = SOURCE_IDS.filter((id) => !isDrmSource(id) && !isMuxSource(id));
export const DEFAULT_SOURCE: SourceId = 'hls-1';
export const DEFAULT_DASH_SOURCE: SourceId = 'dash-1';
/**
 * Where the SPF background presets land when entered. The 4K ladder rather than {@link DEFAULT_SOURCE}, which is
 * MPEG-TS and so is a failure case for this engine rather than a demo of it.
 */
export const DEFAULT_BACKGROUND_SOURCE: SourceId = 'hls-4k';

export const BACKGROUND_VIDEO_SRC = 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/low.mp4';

/**
 * Add Mux's rendition cap to a stream URL, the param `<mux-background-video>` exists to demonstrate. Merged rather than
 * appended, since a sandbox source may already carry params of its own (clip bounds, a playback token).
 *
 * Left alone when the URL is signed: Mux validates the whole query against the token, so a param added beside one
 * answers 403 instead of capping — which would replace whatever failure that source was chosen to reach.
 */
export function withMuxMaxResolution(url: string, maxResolution: string): string {
  if (!url || url.includes('token=')) return url;

  const capped = new URL(url);

  capped.searchParams.set('max_resolution', maxResolution);
  return capped.href;
}

export const VIMEO_VIDEO_SRC = 'https://vimeo.com/76979871';

export const YOUTUBE_VIDEO_SRC = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';

export const CLOUDFLARE_VIDEO_SRC = 'https://watch.videodelivery.net/bfbd585059e33391d67b0f1d15fe6ea4';

// An episode rather than a track: Spotify plays episodes in full for a signed-out
// listener, where a track is a 30 second preview.
export const SPOTIFY_AUDIO_SRC = 'https://open.spotify.com/episode/7makk4oTQel546B0PZlDM5';

export const TIKTOK_VIDEO_SRC = 'https://www.tiktok.com/@_luwes/video/7527476667770522893';

// A VOD rather than a channel: a channel embed only plays while its streamer is
// live, so it would show an offline banner most of the time.
export const TWITCH_VIDEO_SRC = 'https://www.twitch.tv/videos/106400740';

/** Returns true when the given source represents a live stream and should use the live-video skin. */
export function isLiveSource(id: SourceId): boolean {
  return SOURCES[id].live === true;
}

/** Returns true when the given source is DRM protected and needs signed tokens. */
export function isDrmSource(id: SourceId): boolean {
  return SOURCES[id].drm === true;
}

/**
 * Returns true when the given source is reached by playback ID, so only a preset whose media builds Mux URLs can offer
 * it — anything else has no `url` to fall back to.
 */
export function isMuxSource(id: SourceId): boolean {
  return SOURCES[id].source?.playbackId !== undefined;
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

/**
 * A CSS image to sit behind the poster while it loads. This upscales a 20px thumbnail, and the browser's own smoothing
 * does the blurring.
 */
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

export function getChapters(source: SourceId): readonly ChapterTrack[] {
  return SOURCES[source].chapters ?? [];
}
