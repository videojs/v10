import { ProxyMixin } from '../../core/media/proxy';

export const VideoProxy = ProxyMixin(
  globalThis.HTMLVideoElement ?? class {},
  globalThis.HTMLMediaElement ?? class {},
  globalThis.EventTarget ?? class {}
);
