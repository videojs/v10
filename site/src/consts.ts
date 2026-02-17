export const SITE_TITLE = 'Video.js — Open Source Video Player';
export const SITE_DESCRIPTION = `The open-source video player for React and HTML. Lightweight, accessible components built for performance and streaming.`;
export const GITHUB_REPO_URL = 'https://github.com/videojs/v10/';
export const DISCORD_INVITE_URL = 'https://discord.gg/JBqHh485uF';
export const THEME_KEY = 'vjs-site-theme';

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
