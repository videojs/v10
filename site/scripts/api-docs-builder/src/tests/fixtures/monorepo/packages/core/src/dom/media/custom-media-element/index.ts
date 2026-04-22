/**
 * Mock custom media element infrastructure.
 *
 * Exercises: shared native attributes (via static properties), CSS vars,
 * and slots that the builder reads to populate media element references.
 * Slots are parsed from getVideoTemplateHTML / getCommonTemplateHTML.
 *
 * VideoCSSVars/AudioCSSVars follow the `{ camelKey: '--var-name' }` pattern
 * with JSDoc descriptions, matching UI component css-vars files.
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

function getCommonTemplateHTML(tag: string) {
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

// Stub — the builder parses the AST, it doesn't run the code.
// Mirrors the real CustomMediaElement factory signature.
export function CustomMediaElement(tag: string, Host: any) {
  class CustomMedia {
    static getTemplateHTML = tag === 'video' ? getVideoTemplateHTML : getCommonTemplateHTML(tag);
    static shadowRootOptions = { mode: 'open' };

    static properties = {
      autoPictureInPicture: { type: Boolean },
      autoplay: { type: Boolean },
      controls: { type: Boolean },
      controlsList: { type: String },
      crossOrigin: { type: String },
      defaultMuted: { type: Boolean, attribute: 'muted' },
      disablePictureInPicture: { type: Boolean },
      disableRemotePlayback: { type: Boolean },
      loading: { type: String },
      loop: { type: Boolean },
      playsInline: { type: Boolean },
      poster: { type: String },
      preload: { type: String },
      src: { type: String },
    };
  }

  return CustomMedia;
}
