/** Playwright project names where a page should be skipped (e.g. no native HLS in Firefox). */
type BrowserName = 'chromium' | 'webkit' | 'firefox';

export interface PageEntry {
  name: string;
  path: string;
  framework: string;
  media: string;
  resource: string;
  skipBrowsers?: BrowserName[];
}

// ---------------------------------------------------------------------------
// Packaged skin pages
// ---------------------------------------------------------------------------

export const VIDEO_PAGES = [
  { name: 'HTML Video MP4', path: '/html-video-mp4.html', framework: 'html', media: 'video', resource: 'mp4' },
  {
    name: 'HTML Video HLS',
    path: '/html-video-hls.html',
    framework: 'html',
    media: 'hls-video',
    resource: 'hlsTs',
  },
  {
    name: 'HTML Simple HLS Video fMP4',
    path: '/html-simple-hls-video-fmp4.html',
    framework: 'html',
    media: 'simple-hls-video',
    resource: 'hlsFmp4',
  },
  {
    name: 'HTML DASH Video',
    path: '/html-dash-video.html',
    framework: 'html',
    media: 'dash-video',
    resource: 'dash',
  },
  {
    name: 'HTML Native HLS Video',
    path: '/html-native-hls-video.html',
    framework: 'html',
    media: 'native-hls-video',
    resource: 'hlsTs',
    skipBrowsers: ['firefox'],
  },
  {
    name: 'HTML Mux Video',
    path: '/html-mux-video.html',
    framework: 'html',
    media: 'mux-video',
    resource: 'hlsTs',
  },
  { name: 'React Video MP4', path: '/react-video-mp4.html', framework: 'react', media: 'video', resource: 'mp4' },
  {
    name: 'React Video HLS',
    path: '/react-video-hls.html',
    framework: 'react',
    media: 'hls-video',
    resource: 'hlsTs',
  },
] as const satisfies readonly PageEntry[];

export const AUDIO_PAGES = [
  { name: 'HTML Audio MP4', path: '/html-audio-mp4.html', framework: 'html', media: 'audio', resource: 'mp4' },
  {
    name: 'HTML Mux Audio',
    path: '/html-mux-audio.html',
    framework: 'html',
    media: 'mux-audio',
    resource: 'hlsTs',
  },
  { name: 'React Audio MP4', path: '/react-audio-mp4.html', framework: 'react', media: 'audio', resource: 'mp4' },
] as const satisfies readonly PageEntry[];

// ---------------------------------------------------------------------------
// Ejected skin pages
// ---------------------------------------------------------------------------

export const EJECTED_VIDEO_PAGES = [
  {
    name: 'Ejected HTML Video MP4',
    path: '/ejected-html-video-mp4.html',
    framework: 'html',
    media: 'video',
    resource: 'mp4',
  },
  {
    name: 'Ejected React Video MP4',
    path: '/ejected-react-video-mp4.html',
    framework: 'react',
    media: 'video',
    resource: 'mp4',
  },
] as const satisfies readonly PageEntry[];

// ---------------------------------------------------------------------------
// CDN bundle pages
// ---------------------------------------------------------------------------

export const CDN_VIDEO_PAGES = [
  { name: 'CDN Video MP4', path: '/cdn-video-mp4.html', framework: 'html', media: 'video', resource: 'mp4' },
  { name: 'CDN Video HLS', path: '/cdn-video-hls.html', framework: 'html', media: 'hls-video', resource: 'hlsTs' },
] as const satisfies readonly PageEntry[];

// ---------------------------------------------------------------------------
// Combined arrays for parameterized tests
// ---------------------------------------------------------------------------

export const ALL_VIDEO_PAGES = [...VIDEO_PAGES, ...EJECTED_VIDEO_PAGES, ...CDN_VIDEO_PAGES] as const;

/** Pages that include storyboard tracks. */
export const STORYBOARD_PAGES = [
  { name: 'HTML Video MP4', path: '/html-video-mp4.html', resource: 'mp4' },
  { name: 'React Video MP4', path: '/react-video-mp4.html', resource: 'mp4' },
  { name: 'HTML Video HLS', path: '/html-video-hls.html', resource: 'hlsTs' },
  { name: 'React Video HLS', path: '/react-video-hls.html', resource: 'hlsTs' },
  { name: 'HTML Simple HLS Video fMP4', path: '/html-simple-hls-video-fmp4.html', resource: 'hlsFmp4' },
  { name: 'CDN Video MP4', path: '/cdn-video-mp4.html', resource: 'mp4' },
  { name: 'CDN Video HLS', path: '/cdn-video-hls.html', resource: 'hlsTs' },
] as const;
