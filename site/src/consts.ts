// Always https://videojs.org. Unlike Astro.site, which varies per deploy
// (e.g. deploy preview URLs), this is stable for canonical URLs and other
// references that must always point to production.
export const PRODUCTION_URL = new URL('https://videojs.org');
// Pre-release docs host (branch deploy of `main`). Keep references centralized
// here so the hostname can move without touching components.
export const PRERELEASE_URL = new URL('https://main.videojs.org');
export const SITE_TITLE = 'Video.js';
export const SEO_SUFFIX = 'Open Source Video Player';
export const SITE_DESCRIPTION = `The open-source video player for React and HTML. Lightweight, accessible components built for performance and streaming.`;
export const GITHUB_REPO_URL = 'https://github.com/videojs/v10/';
export const DISCORD_INVITE_URL = 'https://discord.gg/JBqHh485uF';
export const MUX_URL = 'https://www.mux.com?utm_source=videojs&utm_campaign=vjs10';
export const MUX_SUPPORT_URL = 'https://www.mux.com/sales-contact?form=sales&utm_source=videojs&utm_campaign=vjs10';
export const THEME_KEY = 'vjs-site-theme';
export const BANNER_DISMISS_KEY = 'vjs-legacy-banner-dismissed';
export const BLOG_PAGE_SIZE = 10;

export function isPrereleaseSite(siteUrl: URL | undefined): boolean {
  return siteUrl?.origin === PRERELEASE_URL.origin;
}

/**
 * Video source for demos and examples throughout the site,
 * wherever JS is used. HTML examples use a separate hardcoded source.
 */
interface VideoSource {
  id: string;
  hls: string;
  mp4: string;
  poster: string;
}

export const VJS8_DEMO_VIDEO: VideoSource = {
  id: 'lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4',
  hls: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8',
  mp4: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
  poster: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.webp',
};

export const VJS10_DEMO_VIDEO: VideoSource = {
  id: 'BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM',
  hls: 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8',
  mp4: 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4',
  poster: 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.webp',
};

// Standalone third-party samples for source types that aren't the shared Mux
// asset above: Mux doesn't serve DASH, and Vimeo is a hosting service. The DASH
// value matches the sample used by the site's DASH reference demo.
export const VJS10_DEMO_DASH = 'https://dash.akamaized.net/akamai/streamroot/050714/Spring_4Ktest.mpd';
export const VJS10_DEMO_VIMEO = 'https://vimeo.com/648359100';
