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
  '--media-video-border-radius': { description: 'Border radius of the video element.' },
  '--media-object-fit': { description: 'Object fit for the video.', default: 'contain' },
  '--media-object-position': { description: 'Object position for the video.', default: 'center' },
  '--media-caption-track-duration': { description: 'Duration of the caption track transition.' },
  '--media-caption-track-delay': { description: 'Delay before the caption track transition.' },
  '--media-caption-track-y': { description: 'Vertical offset of the caption track.' },
} as const;

export const AudioCSSVars = {
  '--media-object-fit': { description: 'Object fit for the audio.', default: 'contain' },
  '--media-object-position': { description: 'Object position for the audio.', default: 'center' },
} as const;

export const VideoSlots = ['media', ''] as const;
export const AudioSlots = ['media', ''] as const;

// Minimal stubs — the builder only needs to detect these by name, not run them.
export function CustomMediaMixin(base: any, _opts: any) {
  return base;
}

export const CustomVideoElement = class {};
export const CustomAudioElement = class {};
