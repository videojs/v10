export function isHTMLVideoElement(value: unknown): value is HTMLVideoElement {
  return value instanceof HTMLVideoElement;
}

export function isHTMLAudioElement(value: unknown): value is HTMLAudioElement {
  return value instanceof HTMLAudioElement;
}

export function isHTMLMediaElement(value: unknown): value is HTMLMediaElement {
  return value instanceof HTMLMediaElement;
}
