import { serializeAttributes } from '@videojs/utils/dom';

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

/** Renders an element's shadow template from its initial attributes. */
export type MediaTemplate = (attrs: Record<string, string>) => string;

export function videoTemplate(attrs: Record<string, string>): string {
  return /*html*/ `
    <style>
      :host {
        display: contents;
      }

      video {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: var(${VideoCSSVars.borderRadius});
        object-fit: var(${VideoCSSVars.objectFit}, contain);
        object-position: var(${VideoCSSVars.objectPosition}, center);
      }

      video::-webkit-media-text-track-container {
        transition: translate var(${VideoCSSVars.captionTrackDuration}, 0) ease-out;
        transition-delay: var(${VideoCSSVars.captionTrackDelay}, 0);
        translate: 0 var(${VideoCSSVars.captionTrackY}, 0);
        scale: 0.98;
        z-index: 1;
        font-family: inherit;
      }
    </style>
    <slot name="media">
      <video${serializeAttributes(attrs)}></video>
    </slot>
    <slot></slot>
  `;
}

export function elementTemplate(tag: string): MediaTemplate {
  return (attrs) => /*html*/ `
    <style>
      :host {
        display: inline-flex;
        line-height: 0;
        flex-direction: column;
        justify-content: end;
      }

      ${tag} {
        width: 100%;
      }
    </style>
    <slot name="media">
      <${tag}${serializeAttributes(attrs)}></${tag}>
    </slot>
    <slot></slot>
  `;
}
