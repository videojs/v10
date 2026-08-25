export function isDocument<Value>(value: Value): value is Value & Document {
  return value instanceof Node && value.nodeType === 9;
}

export function isShadowRoot<Value>(value: Value): value is Value & ShadowRoot {
  return value instanceof Node && value.nodeType === 11 && 'host' in value;
}

export function isHTMLVideoElement<Value>(value: Value): value is Value & HTMLVideoElement {
  return value instanceof HTMLVideoElement;
}

export function isHTMLAudioElement<Value>(value: Value): value is Value & HTMLAudioElement {
  return value instanceof HTMLAudioElement;
}

export function isHTMLMediaElement<Value>(value: Value): value is Value & HTMLMediaElement {
  return value instanceof HTMLMediaElement;
}
