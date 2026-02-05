/** WebKit presentation mode values for iOS Safari. */
export type WebKitPresentationMode = 'inline' | 'fullscreen' | 'picture-in-picture';

/** Extended HTMLVideoElement with WebKit vendor APIs. */
export interface WebKitVideoElement extends HTMLVideoElement {
  /** Whether the video is displaying in fullscreen (iOS Safari). */
  webkitDisplayingFullscreen?: boolean;
  /** Current WebKit presentation mode (iOS Safari). */
  webkitPresentationMode?: WebKitPresentationMode;
  /** Whether WebKit fullscreen is supported (iOS Safari). */
  webkitSupportsFullscreen?: boolean;
  /** Enter fullscreen using WebKit API (iOS Safari). */
  webkitEnterFullscreen?: () => void;
  /** Exit fullscreen using WebKit API (iOS Safari). */
  webkitExitFullscreen?: () => void;
  /** Set WebKit presentation mode (iOS Safari). */
  webkitSetPresentationMode?: (mode: WebKitPresentationMode) => void;
}

/** Extended Element with WebKit fullscreen vendor API. */
export interface WebKitFullscreenElement extends Element {
  /** Request fullscreen using WebKit API (Safari). */
  webkitRequestFullscreen?: () => Promise<void>;
  /** Request fullscreen using WebKit API (older Safari). */
  webkitRequestFullScreen?: () => Promise<void>;
}

/** Extended Document with WebKit fullscreen vendor APIs. */
export interface WebKitDocument extends Document {
  /** Current fullscreen element (WebKit). */
  webkitFullscreenElement?: Element | null;
  /** Whether fullscreen is enabled (WebKit). */
  webkitFullscreenEnabled?: boolean;
  /** Exit fullscreen (WebKit). */
  webkitExitFullscreen?: () => Promise<void>;
  /** Exit fullscreen (older WebKit). */
  webkitCancelFullScreen?: () => Promise<void>;
}
