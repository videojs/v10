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
// Packaged skin pages (generated → src/pages/)
// ---------------------------------------------------------------------------

export const VIDEO_PAGES = [
  { name: 'HTML Video MP4', path: '/pages/html-video-mp4.html', framework: 'html', media: 'video', resource: 'mp4' },
  {
    name: 'HTML Video HLS',
    path: '/pages/html-video-hls.html',
    framework: 'html',
    media: 'hls-video',
    resource: 'hlsTs',
  },
  {
    name: 'HTML Simple HLS Video fMP4',
    path: '/pages/html-simple-hls-video-fmp4.html',
    framework: 'html',
    media: 'simple-hls-video',
    resource: 'hlsFmp4',
  },
  {
    name: 'HTML DASH Video',
    path: '/pages/html-dash-video.html',
    framework: 'html',
    media: 'dash-video',
    resource: 'dash',
  },
  {
    name: 'HTML Native HLS Video',
    path: '/pages/html-native-hls-video.html',
    framework: 'html',
    media: 'native-hls-video',
    resource: 'hlsTs',
    skipBrowsers: ['firefox', 'webkit'],
  },
  {
    name: 'HTML Mux Video',
    path: '/pages/html-mux-video.html',
    framework: 'html',
    media: 'mux-video',
    resource: 'hlsTs',
  },
  {
    name: 'React Video MP4',
    path: '/pages/react-video-mp4.html',
    framework: 'react',
    media: 'video',
    resource: 'mp4',
  },
  {
    name: 'React Video HLS',
    path: '/pages/react-video-hls.html',
    framework: 'react',
    media: 'hls-video',
    resource: 'hlsTs',
  },
] as const satisfies readonly PageEntry[];

export const AUDIO_PAGES = [
  {
    name: 'HTML Audio MP4',
    path: '/pages/html-audio-mp4.html',
    framework: 'html',
    media: 'audio',
    resource: 'mp4',
  },
  {
    name: 'HTML Mux Audio',
    path: '/pages/html-mux-audio.html',
    framework: 'html',
    media: 'mux-audio',
    resource: 'hlsTs',
  },
  {
    name: 'React Audio MP4',
    path: '/pages/react-audio-mp4.html',
    framework: 'react',
    media: 'audio',
    resource: 'mp4',
  },
] as const satisfies readonly PageEntry[];

// ---------------------------------------------------------------------------
// Ejected skin pages (generated → src/pages/)
// ---------------------------------------------------------------------------

export const EJECTED_VIDEO_PAGES = [
  {
    name: 'Ejected HTML Video MP4',
    path: '/pages/ejected-html-video-mp4.html',
    framework: 'html',
    media: 'video',
    resource: 'mp4',
  },
  {
    name: 'Ejected React Video MP4',
    path: '/pages/ejected-react-video-mp4.html',
    framework: 'react',
    media: 'video',
    resource: 'mp4',
  },
] as const satisfies readonly PageEntry[];

// ---------------------------------------------------------------------------
// CDN bundle pages (generated → src/pages/)
// ---------------------------------------------------------------------------

export const CDN_VIDEO_PAGES = [
  {
    name: 'CDN Video MP4',
    path: '/pages/cdn-video-mp4.html',
    framework: 'html',
    media: 'video',
    resource: 'mp4',
  },
  {
    name: 'CDN Video HLS',
    path: '/pages/cdn-video-hls.html',
    framework: 'html',
    media: 'hls-video',
    resource: 'hlsTs',
  },
] as const satisfies readonly PageEntry[];

// ---------------------------------------------------------------------------
// Combined arrays for parameterized tests
// ---------------------------------------------------------------------------

export const ALL_VIDEO_PAGES = [...VIDEO_PAGES, ...EJECTED_VIDEO_PAGES, ...CDN_VIDEO_PAGES] as const;
