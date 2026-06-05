export function isDocument(value: unknown): value is Document {
  return value instanceof Node && value.nodeType === 9;
}

export function isShadowRoot(value: unknown): value is ShadowRoot {
  return value instanceof Node && value.nodeType === 11 && 'host' in value;
}

export function isHTMLVideoElement(value: unknown): value is HTMLVideoElement {
  return value instanceof HTMLVideoElement;
}

export function isHTMLAudioElement(value: unknown): value is HTMLAudioElement {
  return value instanceof HTMLAudioElement;
}

export function isHTMLMediaElement(value: unknown): value is HTMLMediaElement {
  return value instanceof HTMLMediaElement;
}
