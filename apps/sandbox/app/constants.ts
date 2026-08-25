export const SKINS = ['default', 'minimal'] as const;
export const PLATFORMS = ['html', 'react', 'cdn'] as const;
export const STYLINGS = ['css', 'tailwind'] as const;
export const PRESETS = [
  'video',
  'hlsjs-video',
  'native-hls-video',
  'mux-video',
  'mux-video-spf',
  'mux-audio',
  'mux-audio-spf',
  'hls-video',
  'hls-audio',
  'dash-video',
  'shaka-video',
  'audio',
  'background-video',
  'hls-background-video',
  'mux-background-video',
  'vimeo-video',
  'youtube-video',
  'cloudflare-video',
  'spotify-audio',
  'tiktok-video',
  'twitch-video',
] as const;

/**
 * Presets that hand playback to a third-party embed. They render one fixed source rather than the source picker's list,
 * and have no Tailwind skin variant, so the navbar disables both controls for them.
 */
export const EMBED_PRESETS = [
  'vimeo-video',
  'youtube-video',
  'cloudflare-video',
  'spotify-audio',
  'tiktok-video',
  'twitch-video',
] as const;
