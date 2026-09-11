/**
 * Mock media templates — mirrors the real templates.ts.
 *
 * Exercises: the CSS vars and the slots the builder reads from the templates. VideoCSSVars/AudioCSSVars follow the
 * `{ camelKey: '--var-name' }` pattern with JSDoc descriptions, matching UI component css-vars files.
 */

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
export function videoTemplate(attrs: Record<string, string>): string {
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

export function elementTemplate(tag: string) {
  return (attrs: Record<string, string>) => {
    return /*html*/ `
      <style>
        ${tag} { width: 100%; }
      </style>
      <slot name="media">
        <${tag}></${tag}>
      </slot>
      <slot></slot>
    `;
  };
}
