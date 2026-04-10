/** Mux-hosted media sources for e2e tests. */
export const MEDIA = {
  mp4: {
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
    poster: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg',
    storyboard: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/storyboard.vtt',
  },
  hls: {
    url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
    poster: 'https://image.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA/thumbnail.jpg',
    storyboard: 'https://image.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA/storyboard.vtt',
  },
  hls2: {
    url: 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008.m3u8',
    poster: 'https://image.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/thumbnail.jpg',
    storyboard: 'https://image.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/storyboard.vtt',
  },
} as const;

// ---------------------------------------------------------------------------
// Packaged skin pages
// ---------------------------------------------------------------------------

export const VIDEO_PAGES = [
  { name: 'HTML Video MP4', path: '/html-video-mp4.html', renderer: 'html', media: 'mp4' },
  { name: 'HTML Video HLS', path: '/html-video-hls.html', renderer: 'html', media: 'hls' },
  { name: 'React Video MP4', path: '/react-video-mp4.html', renderer: 'react', media: 'mp4' },
  { name: 'React Video HLS', path: '/react-video-hls.html', renderer: 'react', media: 'hls' },
] as const;

export const AUDIO_PAGES = [
  { name: 'HTML Audio MP4', path: '/html-audio-mp4.html', renderer: 'html', media: 'mp4' },
  { name: 'React Audio MP4', path: '/react-audio-mp4.html', renderer: 'react', media: 'mp4' },
] as const;

// ---------------------------------------------------------------------------
// Ejected skin pages
// ---------------------------------------------------------------------------

export const EJECTED_VIDEO_PAGES = [
  {
    name: 'Ejected HTML Video MP4',
    path: '/ejected-html-video-mp4.html',
    renderer: 'html',
    media: 'mp4',
  },
  {
    name: 'Ejected React Video MP4',
    path: '/ejected-react-video-mp4.html',
    renderer: 'react',
    media: 'mp4',
  },
] as const;

// ---------------------------------------------------------------------------
// CDN bundle pages
// ---------------------------------------------------------------------------

export const CDN_VIDEO_PAGES = [
  { name: 'CDN Video MP4', path: '/cdn-video-mp4.html', renderer: 'html', media: 'mp4' },
  { name: 'CDN Video HLS', path: '/cdn-video-hls.html', renderer: 'html', media: 'hls' },
] as const;

// ---------------------------------------------------------------------------
// Combined arrays for parameterized tests
// ---------------------------------------------------------------------------

export const ALL_VIDEO_PAGES = [...VIDEO_PAGES, ...EJECTED_VIDEO_PAGES, ...CDN_VIDEO_PAGES] as const;

/** Pages that include storyboard tracks. */
export const STORYBOARD_PAGES = [
  { name: 'HTML Video MP4', path: '/html-video-mp4.html', media: 'mp4' },
  { name: 'React Video MP4', path: '/react-video-mp4.html', media: 'mp4' },
  { name: 'HTML Video HLS', path: '/html-video-hls.html', media: 'hls' },
  { name: 'React Video HLS', path: '/react-video-hls.html', media: 'hls' },
  { name: 'CDN Video MP4', path: '/cdn-video-mp4.html', media: 'mp4' },
  { name: 'CDN Video HLS', path: '/cdn-video-hls.html', media: 'hls' },
] as const;
