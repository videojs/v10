/**
 * Mock custom media element infrastructure.
 *
 * Exercises: shared Events, Attributes, CSS vars, and slots arrays/objects
 * that the builder reads to populate media element references.
 *
 * VideoCSSVars/AudioCSSVars and VideoSlots/AudioSlots are structured objects
 * that serve as the single source of truth — consumed by both the template
 * rendering and the api-docs builder.
 */

export const Events = [
  'abort',
  'canplay',
  'durationchange',
  'ended',
  'pause',
  'play',
  'timeupdate',
  'volumechange',
] as const;

export const Attributes = [
  'autoplay',
  'controls',
  'crossorigin',
  'loop',
  'muted',
  'playsinline',
  'poster',
  'preload',
  'src',
] as const;

export const VideoCSSVars = {
  /** Border radius of the video element. */
  borderRadius: '--media-video-border-radius',
  /** Object fit for the video. */
  objectFit: '--media-object-fit',
  /** Object position for the video. */
  objectPosition: '--media-object-position',
  /** Duration of the caption track transition. */
  captionTrackDuration: '--media-caption-track-duration',
  /** Delay before the caption track transition. */
  captionTrackDelay: '--media-caption-track-delay',
  /** Vertical offset of the caption track. */
  captionTrackY: '--media-caption-track-y',
} as const;

export const AudioCSSVars = {
  /** Object fit for the audio. */
  objectFit: '--media-object-fit',
  /** Object position for the audio. */
  objectPosition: '--media-object-position',
} as const;

export const VideoSlots = ['media', ''] as const;
export const AudioSlots = ['media', ''] as const;

// Minimal stubs — the builder only needs to detect these by name, not run them.
export function CustomMediaMixin(base: any, _opts: any) {
  return base;
}

export const CustomVideoElement = class {};
export const CustomAudioElement = class {};
