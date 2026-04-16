export const VideoCSSVars = {
  borderRadius: '--media-video-border-radius',
  objectFit: '--media-object-fit',
  objectPosition: '--media-object-position',
  captionTrackDuration: '--media-caption-track-duration',
  captionTrackDelay: '--media-caption-track-delay',
  captionTrackY: '--media-caption-track-y',
} as const;

export const AudioCSSVars = {} as const;

export function CustomMediaElement(_tag: string, _MediaHost: any): any {
  return class extends (globalThis.HTMLElement ?? class {}) {};
}
