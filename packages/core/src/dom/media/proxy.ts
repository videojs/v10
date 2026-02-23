import { MediaApiProxyMixin } from '../../core/media/proxy';

export type { MediaApiProxyTarget } from '../../core/media/proxy';

export class MediaApiProxy extends MediaApiProxyMixin<HTMLMediaElement>(HTMLMediaElement, EventTarget) {}
export class VideoApiProxy extends MediaApiProxyMixin<HTMLVideoElement>(
  HTMLVideoElement,
  HTMLMediaElement,
  EventTarget
) {}
export class AudioApiProxy extends MediaApiProxyMixin<HTMLAudioElement>(
  HTMLAudioElement,
  HTMLMediaElement,
  EventTarget
) {}
