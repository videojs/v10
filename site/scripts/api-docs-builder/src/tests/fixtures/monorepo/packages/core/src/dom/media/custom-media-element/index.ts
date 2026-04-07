/**
 * Mock custom media element infrastructure.
 *
 * Exercises: shared Events, Attributes, and CSS vars that the builder reads
 * to populate media element references. Slots are parsed from the template
 * HTML (getVideoTemplateHTML / getAudioTemplateHTML), not from exported arrays.
 *
 * VideoCSSVars/AudioCSSVars follow the `{ camelKey: '--var-name' }` pattern
 * with JSDoc descriptions, matching UI component css-vars files.
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

/** CSS custom property names for video elements. */
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

/** CSS custom property names for audio elements. */
export const AudioCSSVars = {} as const;

// Minimal template stubs — the builder parses <slot> elements from these.
function getVideoTemplateHTML(attrs: Record<string, string>): string {
  return /*html*/ `
    <style>
      video {
        border-radius: var(${VideoCSSVars.borderRadius});
        object-fit: var(${VideoCSSVars.objectFit}, contain);
        object-position: var(${VideoCSSVars.objectPosition}, center);
      }
    </style>
    <slot name="media">
      <video></video>
    </slot>
    <slot></slot>
  `;
}

function getAudioTemplateHTML(attrs: Record<string, string>): string {
  return /*html*/ `
    <style>
      audio { width: 100%; }
    </style>
    <slot name="media">
      <audio></audio>
    </slot>
    <slot></slot>
  `;
}

// Minimal stubs — the builder only needs to detect these by name, not run them.
export function CustomMediaMixin(base: any, _opts: any) {
  return base;
}

export const CustomVideoElement = class {
  static getTemplateHTML = getVideoTemplateHTML;
};
export const CustomAudioElement = class {
  static getTemplateHTML = getAudioTemplateHTML;
};
