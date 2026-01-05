/**
 * Type guard to check if a value is an HTMLVideoElement.
 */
export function isHTMLVideo(target: unknown): target is HTMLVideoElement {
  return target instanceof HTMLVideoElement;
}

/**
 * Type guard to check if a value is an HTMLAudioElement.
 */
export function isHTMLAudio(target: unknown): target is HTMLAudioElement {
  return target instanceof HTMLAudioElement;
}

/**
 * Type guard to check if a value is an HTMLMediaElement.
 */
export function isHTMLMedia(target: unknown): target is HTMLMediaElement {
  return target instanceof HTMLMediaElement;
}
