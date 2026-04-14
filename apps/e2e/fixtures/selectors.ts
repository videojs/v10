/**
 * Cross-renderer selectors that work for both HTML (Web Components) and React.
 *
 * HTML uses custom element tags: `media-play-button`, `media-time-slider`, etc.
 * React uses standard elements with CSS classes: `button.media-button--play`, etc.
 *
 * Both renderers apply the **same data attributes** for state (`data-paused`,
 * `data-muted`, etc.), which is what tests assert against.
 *
 * Each selector uses a CSS `,` (or) to match either renderer.
 */
export const SELECTORS = {
  // Player containers
  // HTML: <video-player>, React: wrapper div around VideoSkin
  videoPlayer: 'video-player, .media-default-skin--video, .media-minimal-skin--video',
  audioPlayer: 'audio-player, .media-default-skin--audio, .media-minimal-skin--audio',
  // The visible container with dimensions — used for screenshots
  container: '.media-default-skin, .media-minimal-skin',

  // Controls bar
  controls: 'media-controls, .media-controls',

  // Buttons
  playButton: 'media-play-button, .media-button--play',
  seekBackward: 'media-seek-button[data-direction="backward"], .media-button--seek[data-direction="backward"]',
  seekForward: 'media-seek-button[data-direction="forward"], .media-button--seek[data-direction="forward"]',
  muteButton: 'media-mute-button, .media-button--mute',
  fullscreenButton: 'media-fullscreen-button, .media-button--fullscreen',
  pipButton: 'media-pip-button, .media-button--pip',
  captionsButton: 'media-captions-button, .media-button--captions',
  playbackRateButton: 'media-playback-rate-button, .media-button--playback-rate',

  // Sliders
  // HTML: <media-time-slider>, React: horizontal .media-slider inside .media-time-controls
  timeSlider: 'media-time-slider, .media-time-controls .media-slider',
  volumeSlider: 'media-volume-slider, .media-slider[data-orientation="vertical"]',
  sliderThumb: 'media-slider-thumb, .media-slider__thumb',

  // Display elements
  // HTML uses attribute `type`, React uses `data-type`
  currentTime: 'media-time[type="current"], [data-type="current"].media-time',
  duration: 'media-time[type="duration"], [data-type="duration"].media-time',
  poster: 'media-poster, img[data-visible]',
  bufferingIndicator: 'media-buffering-indicator, .media-buffering-indicator',
  thumbnail: 'media-slider-thumbnail, .media-preview__thumbnail',

  // Popover & tooltip
  tooltip: 'media-tooltip, .media-tooltip',
  popover: 'media-popover, .media-popover',
  errorDialog: 'media-error-dialog, .media-error',

  // Media element — matches all renderer custom elements and native media
  media: 'video, audio, hls-video, simple-hls-video, native-hls-video, dash-video, mux-video, mux-audio',
} as const;

/** Data attributes used for player state (same across both renderers). */
export const DATA_ATTRS = {
  paused: 'data-paused',
  ended: 'data-ended',
  started: 'data-started',
  muted: 'data-muted',
  active: 'data-active',
  fullscreen: 'data-fullscreen',
  pip: 'data-pip',
  visible: 'data-visible',
  dragging: 'data-dragging',
  pointing: 'data-pointing',
  interactive: 'data-interactive',
  seeking: 'data-seeking',
  disabled: 'data-disabled',
  availability: 'data-availability',
  volumeLevel: 'data-volume-level',
  rate: 'data-rate',
  direction: 'data-direction',
  loading: 'data-loading',
  error: 'data-error',
  hidden: 'data-hidden',
  open: 'data-open',
  userActive: 'data-user-active',
} as const;
