/** Media sources for e2e tests. */
export const MEDIA = {
  mp4: {
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
    poster: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg',
    storyboard: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/storyboard.vtt',
  },
  hlsTs: {
    url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
    poster: 'https://image.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA/thumbnail.jpg',
    storyboard: 'https://image.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA/storyboard.vtt',
  },
  hlsFmp4: {
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8',
    poster: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg',
    storyboard: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/storyboard.vtt',
  },
  dash: {
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
} as const;

// ---------------------------------------------------------------------------
// Packaged skin pages
// ---------------------------------------------------------------------------

export const VIDEO_PAGES = [
  { name: 'HTML Video MP4', path: '/html-video-mp4.html', framework: 'html', mediaRenderer: 'video', media: 'mp4' },
  {
    name: 'HTML Video HLS',
    path: '/html-video-hls.html',
    framework: 'html',
    mediaRenderer: 'hls-video',
    media: 'hlsTs',
  },
  {
    name: 'HTML Simple HLS Video fMP4',
    path: '/html-simple-hls-video-fmp4.html',
    framework: 'html',
    mediaRenderer: 'simple-hls-video',
    media: 'hlsFmp4',
  },
  {
    name: 'HTML DASH Video',
    path: '/html-dash-video.html',
    framework: 'html',
    mediaRenderer: 'dash-video',
    media: 'dash',
  },
  { name: 'React Video MP4', path: '/react-video-mp4.html', framework: 'react', mediaRenderer: 'video', media: 'mp4' },
  {
    name: 'React Video HLS',
    path: '/react-video-hls.html',
    framework: 'react',
    mediaRenderer: 'hls-video',
    media: 'hlsTs',
  },
] as const;

export const AUDIO_PAGES = [
  { name: 'HTML Audio MP4', path: '/html-audio-mp4.html', framework: 'html', mediaRenderer: 'audio', media: 'mp4' },
  { name: 'React Audio MP4', path: '/react-audio-mp4.html', framework: 'react', mediaRenderer: 'audio', media: 'mp4' },
] as const;

// ---------------------------------------------------------------------------
// Ejected skin pages
// ---------------------------------------------------------------------------

export const EJECTED_VIDEO_PAGES = [
  {
    name: 'Ejected HTML Video MP4',
    path: '/ejected-html-video-mp4.html',
    framework: 'html',
    mediaRenderer: 'video',
    media: 'mp4',
  },
  {
    name: 'Ejected React Video MP4',
    path: '/ejected-react-video-mp4.html',
    framework: 'react',
    mediaRenderer: 'video',
    media: 'mp4',
  },
] as const;

// ---------------------------------------------------------------------------
// CDN bundle pages
// ---------------------------------------------------------------------------

export const CDN_VIDEO_PAGES = [
  { name: 'CDN Video MP4', path: '/cdn-video-mp4.html', framework: 'html', mediaRenderer: 'video', media: 'mp4' },
  { name: 'CDN Video HLS', path: '/cdn-video-hls.html', framework: 'html', mediaRenderer: 'hls-video', media: 'hlsTs' },
] as const;

// ---------------------------------------------------------------------------
// Combined arrays for parameterized tests
// ---------------------------------------------------------------------------

export const ALL_VIDEO_PAGES = [...VIDEO_PAGES, ...EJECTED_VIDEO_PAGES, ...CDN_VIDEO_PAGES] as const;

/** Pages that include storyboard tracks. */
export const STORYBOARD_PAGES = [
  { name: 'HTML Video MP4', path: '/html-video-mp4.html', media: 'mp4' },
  { name: 'React Video MP4', path: '/react-video-mp4.html', media: 'mp4' },
  { name: 'HTML Video HLS', path: '/html-video-hls.html', media: 'hlsTs' },
  { name: 'React Video HLS', path: '/react-video-hls.html', media: 'hlsTs' },
  { name: 'HTML Simple HLS Video fMP4', path: '/html-simple-hls-video-fmp4.html', media: 'hlsFmp4' },
  { name: 'CDN Video MP4', path: '/cdn-video-mp4.html', media: 'mp4' },
  { name: 'CDN Video HLS', path: '/cdn-video-hls.html', media: 'hlsTs' },
] as const;
